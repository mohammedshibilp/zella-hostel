from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


class Guest(Base):
    __tablename__ = "guests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    contact_no = Column(String(50), nullable=False)
    email = Column(String(255), nullable=True)
    occupation = Column(String(100), default="Studying", nullable=True)  # Working, Studying
    guardian_name = Column(String(255), nullable=True)
    guardian_phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    id_proof_type = Column(String(50), default="Aadhar Card", nullable=True)
    id_proof_number = Column(String(100), nullable=True)
    status = Column(String(50), default="Active", nullable=False)  # "Active", "Vacated"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    admissions = relationship("Admission", back_populates="guest", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="guest", cascade="all, delete-orphan")
    fee_receipts = relationship("FeeReceipt", back_populates="guest")
    account_transactions = relationship("AccountTransaction", back_populates="guest")
