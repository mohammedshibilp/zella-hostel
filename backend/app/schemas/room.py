from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class BedBase(BaseModel):
    bed_number: str
    is_occupied: bool = False
    status: str = "Available"
    notes: Optional[str] = None


class BedCreate(BedBase):
    room_id: int


class BedResponse(BedBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_id: int


class RoomBase(BaseModel):
    room_number: str
    floor: int
    capacity: int = 2
    room_type: str = "Standard Sharing"
    status: str = "Available"
    notes: Optional[str] = None


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    floor: Optional[int] = None
    capacity: Optional[int] = None
    room_type: Optional[str] = None
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
