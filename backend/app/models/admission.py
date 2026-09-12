from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, Float, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


class Admission(Base):
    __tablename__ = "admissions"

    id = Column(Integer, primary_key=True, index=True)
    guest_id = Column(Integer, ForeignKey("guests.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="RESTRICT"), nullable=False)
    bed_id = Column(Integer, ForeignKey("beds.id", ondelete="RESTRICT"), nullable=False)
    package_id = Column(Integer, ForeignKey("packages.id", ondelete="SET NULL"), nullable=True)
    admission_date = Column(Date, default=date.today, nullable=False)
    security_deposit = Column(Float, default=0.0, nullable=False)
    monthly_fee = Column(Float, nullable=False)
    status = Column(String(50), default="Active", nullable=False)  # "Active", "CheckedOut"
    checkout_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    guest = relationship("Guest", back_populates="admissions")
    room = relationship("Room")
    bed = relationship("Bed", back_populates="admissions")
    package = relationship("Package")
    fee_receipts = relationship("FeeReceipt", back_populates="admission")
