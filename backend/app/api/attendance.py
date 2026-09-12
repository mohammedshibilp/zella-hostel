from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import require_staff_or_admin
from app.models.user import User
from app.models.guest import Guest
from app.models.admission import Admission
from app.models.attendance import Attendance
from app.schemas.attendance import (
    BulkAttendanceCreate,
    AttendanceResponse,
    AttendanceSummary,
)

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.get("", response_model=List[AttendanceResponse])
def get_attendance(
    attendance_date: Optional[date] = None,
    guest_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    query = db.query(Attendance)
    if attendance_date:
        query = query.filter(Attendance.date == attendance_date)
    if guest_id:
        query = query.filter(Attendance.guest_id == guest_id)
    return query.order_by(Attendance.date.desc(), Attendance.id.desc()).all()


@router.get("/summary", response_model=AttendanceSummary)
def get_attendance_summary(
    attendance_date: date = date.today(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    total_active_guests = db.query(Guest).filter(Guest.status == "Active").count()
    records = db.query(Attendance).filter(Attendance.date == attendance_date).all()
    
    present = sum(1 for r in records if r.status == "Present")
    absent = sum(1 for r in records if r.status == "Absent")
    leave = sum(1 for r in records if r.status == "Leave")
    not_marked = max(0, total_active_guests - len(records))

    return AttendanceSummary(
        date=attendance_date,
        total_active_guests=total_active_guests,
        present_count=present,
        absent_count=absent,
        leave_count=leave,
        not_marked_count=not_marked
    )


@router.post("/bulk", response_model=List[AttendanceResponse])
def save_bulk_attendance(
    bulk_data: BulkAttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    saved_records = []
    for item in bulk_data.records:
        existing = db.query(Attendance).filter(
            Attendance.guest_id == item.guest_id,
            Attendance.date == bulk_data.date
        ).first()

        if existing:
            existing.status = item.status
            existing.remarks = item.remarks
            saved_records.append(existing)
        else:
            rec = Attendance(
                guest_id=item.guest_id,
                date=bulk_data.date,
                status=item.status,
                remarks=item.remarks
            )
            db.add(rec)
            saved_records.append(rec)
            
    db.commit()
    for r in saved_records:
        db.refresh(r)
    return saved_records
