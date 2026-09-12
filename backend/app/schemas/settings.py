from datetime import date as dt_date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class MaintenanceRecordBase(BaseModel):
    room_id: int
    title: str
    description: Optional[str] = None
    cost: float = 0.0
    status: str = "Pending"  # "Pending", "In Progress", "Resolved"
    reported_date: dt_date = Field(default_factory=dt_date.today)
    resolved_date: Optional[dt_date] = None


class MaintenanceRecordCreate(MaintenanceRecordBase):
    pass


class MaintenanceRecordUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[float] = None
    status: Optional[str] = None
    resolved_date: Optional[dt_date] = None


class MaintenanceRecordResponse(MaintenanceRecordBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    room_number: Optional[str] = None


class HostelSettingBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


class HostelSettingCreate(HostelSettingBase):
    pass


class HostelSettingResponse(HostelSettingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
