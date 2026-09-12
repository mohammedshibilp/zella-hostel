from datetime import date as dt_date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.package import PackageResponse


class EnquiryBase(BaseModel):
    date: dt_date
    name: str
    mode: str = "Walk-in"  # "Call", "Walk-in"
    occupation: str = "Studying"  # "Working", "Studying"
    approx_coming_date: Optional[dt_date] = None
    package_id: Optional[int] = None
    contact_no: str
    current_status: str = "Open"  # "Open", "Converted", "Closed"
    notes: Optional[str] = None


class EnquiryCreate(EnquiryBase):
    pass


class EnquiryUpdate(BaseModel):
    date: Optional[dt_date] = None
    name: Optional[str] = None
    mode: Optional[str] = None
    occupation: Optional[str] = None
    approx_coming_date: Optional[dt_date] = None
    package_id: Optional[int] = None
    contact_no: Optional[str] = None
    current_status: Optional[str] = None
    notes: Optional[str] = None


class EnquiryResponse(EnquiryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    package: Optional[PackageResponse] = None
