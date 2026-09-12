from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PackageBase(BaseModel):
    name: str
    monthly_fee: float
    security_deposit: float = 0.0
    description: Optional[str] = None
    amenities: Optional[str] = None
    is_active: bool = True


class PackageCreate(PackageBase):
    pass


class PackageUpdate(BaseModel):
    name: Optional[str] = None
    monthly_fee: Optional[float] = None
    security_deposit: Optional[float] = None
    description: Optional[str] = None
    amenities: Optional[str] = None
    is_active: Optional[bool] = None


class PackageResponse(PackageBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
