from datetime import date as dt_date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.room import RoomBase, BedResponse
from app.schemas.package import PackageResponse


class BookingBase(BaseModel):
    guest_name: str
    contact_no: str
    email: Optional[str] = None
    room_id: int
    bed_id: int
    package_id: Optional[int] = None
    booking_date: dt_date = Field(default_factory=dt_date.today)
    check_in_date: dt_date
    expected_check_out_date: Optional[dt_date] = None
    advance_amount: float = 0.0
    status: str = "Confirmed"
    notes: Optional[str] = None


class BookingCreate(BookingBase):
    pass


class BookingUpdate(BaseModel):
    guest_name: Optional[str] = None
    contact_no: Optional[str] = None
    email: Optional[str] = None
    room_id: Optional[int] = None
    bed_id: Optional[int] = None
    package_id: Optional[int] = None
    check_in_date: Optional[dt_date] = None
    expected_check_out_date: Optional[dt_date] = None
    advance_amount: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class BookingResponse(BookingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    room: Optional[RoomBase] = None
    bed: Optional[BedResponse] = None
    package: Optional[PackageResponse] = None
