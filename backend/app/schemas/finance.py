from datetime import date as dt_date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.guest import GuestResponse


class FeeReceiptCreate(BaseModel):
    guest_id: int
    admission_id: Optional[int] = None
    date: dt_date = Field(default_factory=dt_date.today)
    fee_type: str = "Hostel Accommodation Fee"
    amount: float
    discount: float = 0.0
    paid_amount: Optional[float] = None
    balance_amount: float = 0.0
    payment_mode: str = "Cash"  # "Cash", "Bank", "UPI", "Card", "Other"
    payment_reference: Optional[str] = None
    period_start: Optional[dt_date] = None
    period_end: Optional[dt_date] = None
    remarks: Optional[str] = None


class FeeReceiptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    receipt_no: str
    guest_id: int
    admission_id: Optional[int] = None
    date: dt_date
    fee_type: str = "Hostel Accommodation Fee"
    amount: float
    discount: float = 0.0
    paid_amount: float
    balance_amount: float = 0.0
    payment_mode: str
    payment_reference: Optional[str] = None
    period_start: Optional[dt_date] = None
    period_end: Optional[dt_date] = None
    remarks: Optional[str] = None
    created_at: datetime
    guest: Optional[GuestResponse] = None
    room_number: Optional[str] = None
    package_name: Optional[str] = None


class AccountTransactionCreate(BaseModel):
    date: dt_date = Field(default_factory=dt_date.today)
    transaction_type: str = "Plain"  # "Guest", "Plain"
    guest_id: Optional[int] = None
    particulars: str
    amount: float
    payment_channel: str = "Cash"  # "Cash", "Bank"
    entry_type: str = "Cr"  # "Dr", "Cr"
    reference_no: Optional[str] = None


class AccountTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: dt_date
    transaction_type: str
    guest_id: Optional[int] = None
    particulars: str
    amount: float
    payment_channel: str
    entry_type: str
    reference_no: Optional[str] = None
    running_balance: Optional[float] = 0.0
    created_at: datetime
    guest: Optional[GuestResponse] = None


class AccountSummary(BaseModel):
    total_debit: float
    total_credit: float
    net_balance: float
    cash_balance: float
    bank_balance: float
