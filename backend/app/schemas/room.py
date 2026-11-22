from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class BedBase(BaseModel):
    bed_number: str
    is_occupied: bool = False
    status: str = "Available"
    notes: Optional[str] = None


class BedCreate(BedBase):
    room_id: int


class BedAdd(BaseModel):
    bed_number: Optional[str] = None
    notes: Optional[str] = None


class BedResponse(BedBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_id: int
    current_guest_name: Optional[str] = None
    current_guest_contact: Optional[str] = None
    admission_date: Optional[str] = None
    package_name: Optional[str] = None
    monthly_fee: Optional[float] = None
    reserved_guest_name: Optional[str] = None


class RoomBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    room_number: str
    floor: int
    capacity: int = 2
    room_type: str = "Standard Sharing"
    price: float = Field(default=0.0, description="Monthly Room Rent in INR")
    status: str = "Available"
    notes: Optional[str] = None


class RoomCreate(BaseModel):
    room_number: str
    floor: int
    capacity: int = 2
    room_type: str = "Standard Sharing"
    price: float = Field(..., gt=0, description="Monthly Room Rent in INR, required and must be greater than 0")
    status: str = "Available"
    notes: Optional[str] = None


class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    floor: Optional[int] = None
    capacity: Optional[int] = None
    room_type: Optional[str] = None
    price: Optional[float] = Field(None, gt=0, description="Monthly Room Rent in INR, must be greater than 0")
    status: Optional[str] = None
    notes: Optional[str] = None


class RoomDetailResponse(RoomBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    beds: List[BedResponse] = []
    occupied_count: int = 0
    vacant_count: int = 0


class RoomChartSummary(BaseModel):
    total_rooms: int
    total_beds: int
    occupied_beds: int
    vacant_beds: int
    floor_summaries: dict
