from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, Float, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    cost = Column(Float, default=0.0, nullable=False)
    status = Column(String(50), default="Pending", nullable=False)  # "Pending", "In Progress", "Resolved"
    reported_date = Column(Date, default=date.today, nullable=False)
    resolved_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    room = relationship("Room")


class HostelSetting(Base):
    __tablename__ = "hostel_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
