from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


class Enquiry(Base):
    __tablename__ = "enquiries"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, default=date.today, nullable=False)
    name = Column(String(255), nullable=False)
    mode = Column(String(50), default="Walk-in", nullable=False)  # "Call", "Walk-in"
    occupation = Column(String(50), default="Studying", nullable=False)  # "Working", "Studying"
    approx_coming_date = Column(Date, nullable=True)
    package_id = Column(Integer, ForeignKey("packages.id", ondelete="SET NULL"), nullable=True)
    contact_no = Column(String(50), nullable=False)
    current_status = Column(String(50), default="Open", nullable=False)  # "Open", "Converted", "Closed"
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    package = relationship("Package")
