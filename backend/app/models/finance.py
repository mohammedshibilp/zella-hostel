from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, Float, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


class FeeReceipt(Base):
    __tablename__ = "fee_receipts"

    id = Column(Integer, primary_key=True, index=True)
    receipt_no = Column(String(100), unique=True, index=True, nullable=False)
    guest_id = Column(Integer, ForeignKey("guests.id", ondelete="RESTRICT"), nullable=False)
    admission_id = Column(Integer, ForeignKey("admissions.id", ondelete="SET NULL"), nullable=True)
    date = Column(Date, default=date.today, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    payment_mode = Column(String(50), default="Cash", nullable=False)  # "Cash", "Bank", "UPI"
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    guest = relationship("Guest", back_populates="fee_receipts")
    admission = relationship("Admission", back_populates="fee_receipts")


class AccountTransaction(Base):
    __tablename__ = "account_transactions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, default=date.today, nullable=False, index=True)
    transaction_type = Column(String(50), default="Plain", nullable=False)  # "Guest", "Plain"
    guest_id = Column(Integer, ForeignKey("guests.id", ondelete="SET NULL"), nullable=True)
    particulars = Column(String(255), nullable=False)  # Description or Guest details
    amount = Column(Float, nullable=False)
    payment_channel = Column(String(50), default="Cash", nullable=False)  # "Bank", "Cash"
    entry_type = Column(String(10), default="Cr", nullable=False)  # "Dr", "Cr"
    reference_no = Column(String(100), nullable=True)
    running_balance = Column(Float, default=0.0, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    guest = relationship("Guest", back_populates="account_transactions")
