from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import require_staff_or_admin
from app.models.user import User
from app.models.guest import Guest
from app.models.admission import Admission
from app.models.finance import FeeReceipt, AccountTransaction
from app.schemas.finance import FeeReceiptCreate, FeeReceiptResponse

router = APIRouter(prefix="/fee-receipts", tags=["Fee Receipts"])


def generate_receipt_number(db: Session) -> str:
    year = date.today().year
    count = db.query(FeeReceipt).count() + 1
    return f"REC-{year}-{count:04d}"


def serialize_receipt(r: FeeReceipt, db: Session) -> FeeReceiptResponse:
    # Resolve room number and package if active admission exists
    adm = r.admission
    if not adm and r.guest_id:
        adm = db.query(Admission).filter(
            Admission.guest_id == r.guest_id,
            Admission.status == "Active"
        ).first()

    room_num = adm.room.room_number if (adm and adm.room) else None
    pkg_name = adm.package.name if (adm and adm.package) else None

    return FeeReceiptResponse(
        id=r.id,
        receipt_no=r.receipt_no,
        guest_id=r.guest_id,
        admission_id=r.admission_id,
        date=r.date,
        fee_type=r.fee_type,
        amount=r.amount,
        discount=r.discount,
        paid_amount=r.paid_amount,
        balance_amount=r.balance_amount,
        payment_mode=r.payment_mode,
        payment_reference=r.payment_reference,
        period_start=r.period_start,
        period_end=r.period_end,
        remarks=r.remarks,
        created_at=r.created_at,
        guest=r.guest,
        room_number=room_num,
        package_name=pkg_name,
    )


@router.get("", response_model=List[FeeReceiptResponse])
def get_fee_receipts(
    guest_id: Optional[int] = None,
    payment_mode: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    query = db.query(FeeReceipt)
    if guest_id:
        query = query.filter(FeeReceipt.guest_id == guest_id)
    if payment_mode:
        query = query.filter(FeeReceipt.payment_mode == payment_mode)
    records = query.order_by(FeeReceipt.date.desc(), FeeReceipt.id.desc()).all()
    return [serialize_receipt(r, db) for r in records]


@router.get("/{receipt_id}", response_model=FeeReceiptResponse)
def get_fee_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    receipt = db.query(FeeReceipt).filter(FeeReceipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Fee receipt not found")
    return serialize_receipt(receipt, db)


@router.post("", response_model=FeeReceiptResponse, status_code=status.HTTP_201_CREATED)
def create_fee_receipt(
    receipt_in: FeeReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    guest = db.query(Guest).filter(Guest.id == receipt_in.guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    receipt_no = generate_receipt_number(db)
    # Ensure unique receipt number
    while db.query(FeeReceipt).filter(FeeReceipt.receipt_no == receipt_no).first():
        num = int(receipt_no.split("-")[-1]) + 1
        receipt_no = f"REC-{date.today().year}-{num:04d}"

    # Calculate paid and balance amounts
    paid = receipt_in.paid_amount if receipt_in.paid_amount is not None else (receipt_in.amount - receipt_in.discount)
    balance = receipt_in.balance_amount

    receipt = FeeReceipt(
        receipt_no=receipt_no,
        guest_id=receipt_in.guest_id,
        admission_id=receipt_in.admission_id,
        date=receipt_in.date,
        fee_type=receipt_in.fee_type,
        amount=receipt_in.amount,
        discount=receipt_in.discount,
        paid_amount=paid,
        balance_amount=balance,
        payment_mode=receipt_in.payment_mode,
        payment_reference=receipt_in.payment_reference,
        period_start=receipt_in.period_start,
        period_end=receipt_in.period_end,
        remarks=receipt_in.remarks
    )
    db.add(receipt)
    db.flush()

    # Automatically create an Account Transaction for this receipt (Income = Cr)
    pay_channel = "Bank" if receipt_in.payment_mode in ["Bank", "UPI", "Card"] else "Cash"
    tx = AccountTransaction(
        date=receipt_in.date,
        transaction_type="Guest",
        guest_id=guest.id,
        particulars=f"{receipt_in.fee_type} from {guest.name} (Receipt #{receipt_no})",
        amount=paid,
        payment_channel=pay_channel,
        entry_type="Cr",
        reference_no=receipt_no
    )
    db.add(tx)

    db.commit()
    db.refresh(receipt)
    return serialize_receipt(receipt, db)
