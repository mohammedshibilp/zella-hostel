from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String(50), unique=True, index=True, nullable=False)
    floor = Column(Integer, nullable=False)  # 1, 2, 3
    capacity = Column(Integer, default=2, nullable=False)
    room_type = Column(String(50), default="Standard Sharing")  # Single, Double, Triple
    status = Column(String(50), default="Available")  # Available, Full, Maintenance
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    beds = relationship("Bed", back_populates="room", cascade="all, delete-orphan")


class Bed(Base):
    __tablename__ = "beds"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    bed_number = Column(String(50), nullable=False)  # e.g., "101-A", "101-B"
    is_occupied = Column(Boolean, default=False, nullable=False)
    status = Column(String(50), default="Available")  # Available, Occupied, Reserved, Maintenance
    notes = Column(Text, nullable=True)

    room = relationship("Room", back_populates="beds")
    admissions = relationship("Admission", back_populates="bed")
