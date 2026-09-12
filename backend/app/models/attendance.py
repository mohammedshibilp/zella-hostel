from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, Date, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.session import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    guest_id = Column(Integer, ForeignKey("guests.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, default=date.today, nullable=False, index=True)
    status = Column(String(50), default="Present", nullable=False)  # "Present", "Absent", "Leave"
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("guest_id", "date", name="uix_guest_date_attendance"),
    )

    guest = relationship("Guest", back_populates="attendance_records")
