from datetime import date as dt_date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.guest import GuestResponse


class AttendanceRecord(BaseModel):
    guest_id: int
    status: str = "Present"  # "Present", "Absent", "Leave"
    remarks: Optional[str] = None


class BulkAttendanceCreate(BaseModel):
    date: dt_date = Field(default_factory=dt_date.today)
    records: List[AttendanceRecord]


class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    guest_id: int
    date: dt_date
    status: str
    remarks: Optional[str] = None
    created_at: datetime
    guest: Optional[GuestResponse] = None


class AttendanceSummary(BaseModel):
    date: dt_date
    total_active_guests: int
    present_count: int
    absent_count: int
    leave_count: int
    not_marked_count: int
