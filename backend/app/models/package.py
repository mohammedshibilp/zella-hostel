from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from app.database.session import Base


class Package(Base):
    __tablename__ = "packages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)  # e.g., "Standard Double Sharing", "Deluxe Single"
    monthly_fee = Column(Float, nullable=False)
    security_deposit = Column(Float, default=0.0, nullable=False)
    description = Column(Text, nullable=True)
    amenities = Column(String(255), nullable=True)  # e.g., "WiFi, Laundry, 3 Meals"
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
