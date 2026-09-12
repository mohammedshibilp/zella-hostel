from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class GuestBase(BaseModel):
    name: str
    contact_no: str
    email: Optional[str] = None
    occupation: Optional[str] = "Studying"
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    address: Optional[str] = None
    id_proof_type: Optional[str] = "Aadhar Card"
    id_proof_number: Optional[str] = None
    status: str = "Active"


class GuestCreate(GuestBase):
    pass


class GuestUpdate(BaseModel):
    name: Optional[str] = None
    contact_no: Optional[str] = None
    email: Optional[str] = None
    occupation: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    address: Optional[str] = None
    id_proof_type: Optional[str] = None
    id_proof_number: Optional[str] = None
    status: Optional[str] = None


class GuestResponse(GuestBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    room_number: Optional[str] = None
    bed_number: Optional[str] = None
