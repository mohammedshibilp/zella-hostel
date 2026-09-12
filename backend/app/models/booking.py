from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, Float, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    guest_name = Column(String(255), nullable=False)
    contact_no = Column(String(50), nullable=False)
    email = Column(String(255), nullable=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="RESTRICT"), nullable=False)
    bed_id = Column(Integer, ForeignKey("beds.id", ondelete="RESTRICT"), nullable=False)
    package_id = Column(Integer, ForeignKey("packages.id", ondelete="SET NULL"), nullable=True)
    booking_date = Column(Date, default=date.today, nullable=False)
    check_in_date = Column(Date, nullable=False)
    expected_check_out_date = Column(Date, nullable=True)
    advance_amount = Column(Float, default=0.0, nullable=False)
    status = Column(String(50), default="Confirmed", nullable=False)  # "Confirmed", "CheckedIn", "Cancelled"
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    room = relationship("Room")
    bed = relationship("Bed")
    package = relationship("Package")
