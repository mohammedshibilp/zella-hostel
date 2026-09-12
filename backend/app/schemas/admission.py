from datetime import date as dt_date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.guest import GuestResponse
from app.schemas.room import RoomBase, BedResponse
from app.schemas.package import PackageResponse


class AdmissionCreate(BaseModel):
    # If guest_id is provided, use existing guest; otherwise create guest inline
    guest_id: Optional[int] = None
    guest_name: Optional[str] = None
    contact_no: Optional[str] = None
    email: Optional[str] = None
    occupation: Optional[str] = "Studying"
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    address: Optional[str] = None
    id_proof_type: Optional[str] = "Aadhar Card"
    id_proof_number: Optional[str] = None
    
    room_id: int
    bed_id: int
    package_id: Optional[int] = None
    admission_date: dt_date = Field(default_factory=dt_date.today)
    security_deposit: float = 0.0
    monthly_fee: float
    notes: Optional[str] = None


class AdmissionUpdate(BaseModel):
    room_id: Optional[int] = None
    bed_id: Optional[int] = None
    package_id: Optional[int] = None
    monthly_fee: Optional[float] = None
    security_deposit: Optional[float] = None
    status: Optional[str] = None
    checkout_date: Optional[dt_date] = None
    notes: Optional[str] = None


class AdmissionCheckout(BaseModel):
    checkout_date: dt_date = Field(default_factory=dt_date.today)
    notes: Optional[str] = None


class AdmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    guest_id: int
    room_id: int
    bed_id: int
    package_id: Optional[int] = None
    admission_date: dt_date
    security_deposit: float
    monthly_fee: float
    status: str
    checkout_date: Optional[dt_date] = None
    notes: Optional[str] = None
    created_at: datetime
    guest: Optional[GuestResponse] = None
    room: Optional[RoomBase] = None
    bed: Optional[BedResponse] = None
    package: Optional[PackageResponse] = None
