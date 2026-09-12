from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.api.deps import require_staff_or_admin
from app.models.user import User
from app.models.guest import Guest
from app.models.finance import AccountTransaction
from app.schemas.finance import (
    AccountTransactionCreate,
    AccountTransactionResponse,
    AccountSummary,
)

router = APIRouter(prefix="/accounts", tags=["Accounts & Ledger"])


@router.get("", response_model=List[AccountTransactionResponse])
def get_transactions(
    transaction_type: Optional[str] = None,
    entry_type: Optional[str] = None,
    payment_channel: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    query = db.query(AccountTransaction)
    if transaction_type:
        query = query.filter(AccountTransaction.transaction_type == transaction_type)
    if entry_type:
        query = query.filter(AccountTransaction.entry_type == entry_type)
    if payment_channel:
        query = query.filter(AccountTransaction.payment_channel == payment_channel)
    if start_date:
        query = query.filter(AccountTransaction.date >= start_date)
    if end_date:
        query = query.filter(AccountTransaction.date <= end_date)

    return query.order_by(AccountTransaction.date.desc(), AccountTransaction.id.desc()).all()


@router.get("/summary", response_model=AccountSummary)
def get_account_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    total_debit = db.query(func.sum(AccountTransaction.amount)).filter(
        AccountTransaction.entry_type == "Dr"
    ).scalar() or 0.0

    total_credit = db.query(func.sum(AccountTransaction.amount)).filter(
        AccountTransaction.entry_type == "Cr"
    ).scalar() or 0.0

    # Cash Balance
    cash_credit = db.query(func.sum(AccountTransaction.amount)).filter(
        AccountTransaction.payment_channel == "Cash",
        AccountTransaction.entry_type == "Cr"
    ).scalar() or 0.0
    cash_debit = db.query(func.sum(AccountTransaction.amount)).filter(
        AccountTransaction.payment_channel == "Cash",
        AccountTransaction.entry_type == "Dr"
    ).scalar() or 0.0
    cash_balance = cash_credit - cash_debit

    # Bank Balance
    bank_credit = db.query(func.sum(AccountTransaction.amount)).filter(
        AccountTransaction.payment_channel == "Bank",
        AccountTransaction.entry_type == "Cr"
    ).scalar() or 0.0
    bank_debit = db.query(func.sum(AccountTransaction.amount)).filter(
        AccountTransaction.payment_channel == "Bank",
        AccountTransaction.entry_type == "Dr"
    ).scalar() or 0.0
    bank_balance = bank_credit - bank_debit

    net_balance = total_credit - total_debit

    return AccountSummary(
        total_debit=round(total_debit, 2),
        total_credit=round(total_credit, 2),
        net_balance=round(net_balance, 2),
        cash_balance=round(cash_balance, 2),
        bank_balance=round(bank_balance, 2)
    )


@router.post("", response_model=AccountTransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    tx_in: AccountTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    # Validate Guest if transaction_type is Guest
    if tx_in.transaction_type == "Guest" and tx_in.guest_id:
        guest = db.query(Guest).filter(Guest.id == tx_in.guest_id).first()
        if not guest:
            raise HTTPException(status_code=404, detail="Selected guest not found")

    tx = AccountTransaction(**tx_in.model_dump())
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx
