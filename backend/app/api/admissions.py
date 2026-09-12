from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import require_staff_or_admin
from app.models.user import User
from app.models.guest import Guest
from app.models.room import Room, Bed
from app.models.package import Package
from app.models.admission import Admission
from app.models.finance import AccountTransaction
from app.schemas.admission import (
    AdmissionCreate,
    AdmissionUpdate,
    AdmissionCheckout,
    AdmissionResponse,
)

router = APIRouter(prefix="/admissions", tags=["Admissions"])


@router.get("", response_model=List[AdmissionResponse])
def get_admissions(
    status_filter: Optional[str] = None,
    guest_id: Optional[int] = None,
    room_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    query = db.query(Admission)
    if status_filter:
        query = query.filter(Admission.status == status_filter)
    if guest_id:
        query = query.filter(Admission.guest_id == guest_id)
    if room_id:
        query = query.filter(Admission.room_id == room_id)
    return query.order_by(Admission.admission_date.desc(), Admission.id.desc()).all()


@router.post("", response_model=AdmissionResponse, status_code=status.HTTP_201_CREATED)
def create_admission(
    adm_in: AdmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    # 1. Validate Room & Bed
    room = db.query(Room).filter(Room.id == adm_in.room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Selected room not found")
    
    bed = db.query(Bed).filter(Bed.id == adm_in.bed_id, Bed.room_id == adm_in.room_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Selected bed not found in this room")
    
    if bed.is_occupied or bed.status == "Occupied":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bed {bed.bed_number} is already occupied. Please select an available bed."
        )

    # 2. Resolve Guest (either existing or new)
    if adm_in.guest_id:
        guest = db.query(Guest).filter(Guest.id == adm_in.guest_id).first()
        if not guest:
            raise HTTPException(status_code=404, detail="Specified guest not found")
        guest.status = "Active"
    else:
        if not adm_in.guest_name or not adm_in.contact_no:
            raise HTTPException(status_code=400, detail="Guest name and contact number are required")
        guest = Guest(
            name=adm_in.guest_name,
            contact_no=adm_in.contact_no,
            email=adm_in.email,
            occupation=adm_in.occupation,
            guardian_name=adm_in.guardian_name,
            guardian_phone=adm_in.guardian_phone,
            address=adm_in.address,
            id_proof_type=adm_in.id_proof_type,
            id_proof_number=adm_in.id_proof_number,
            status="Active"
        )
        db.add(guest)
        db.flush()

    # 3. Create Admission Record
    admission = Admission(
        guest_id=guest.id,
        room_id=room.id,
        bed_id=bed.id,
        package_id=adm_in.package_id,
        admission_date=adm_in.admission_date,
        security_deposit=adm_in.security_deposit,
        monthly_fee=adm_in.monthly_fee,
        status="Active",
        notes=adm_in.notes
    )
    db.add(admission)
    db.flush()

    # 4. Update Bed and Room Occupancy
    bed.is_occupied = True
    bed.status = "Occupied"

    # Check if all beds in room are occupied
    all_occupied = all(b.is_occupied for b in room.beds)
    if all_occupied:
        room.status = "Full"

    # 5. Record Security Deposit in Accounts if greater than 0
    if adm_in.security_deposit > 0:
        deposit_tx = AccountTransaction(
            date=adm_in.admission_date,
            transaction_type="Guest",
            guest_id=guest.id,
            particulars=f"Security Deposit from {guest.name} (Room {room.room_number}, Bed {bed.bed_number})",
            amount=adm_in.security_deposit,
            payment_channel="Cash",
            entry_type="Cr",
            reference_no=f"DEP-ADM-{admission.id}"
        )
        db.add(deposit_tx)

    db.commit()
    db.refresh(admission)
    return admission


@router.post("/{admission_id}/checkout", response_model=AdmissionResponse)
def checkout_admission(
    admission_id: int,
    checkout_data: AdmissionCheckout,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    admission = db.query(Admission).filter(Admission.id == admission_id).first()
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    if admission.status == "CheckedOut":
        raise HTTPException(status_code=400, detail="Guest is already checked out")

    # Update admission
    admission.status = "CheckedOut"
    admission.checkout_date = checkout_data.checkout_date
    if checkout_data.notes:
        admission.notes = (admission.notes or "") + f" [Checkout: {checkout_data.notes}]"

    # Release Bed
    bed = db.query(Bed).filter(Bed.id == admission.bed_id).first()
    if bed:
        bed.is_occupied = False
        bed.status = "Available"

    # Update Room Status
    room = db.query(Room).filter(Room.id == admission.room_id).first()
    if room and room.status == "Full":
        room.status = "Available"

    # Check if guest has other active admissions; if not, set status to Vacated
    other_active = db.query(Admission).filter(
        Admission.guest_id == admission.guest_id,
        Admission.status == "Active",
        Admission.id != admission.id
    ).count()
    if other_active == 0 and admission.guest:
        admission.guest.status = "Vacated"

    db.commit()
    db.refresh(admission)
    return admission
