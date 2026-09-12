from datetime import date, datetime, timedelta, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.api.deps import require_staff_or_admin
from app.models.user import User
from app.models.guest import Guest
from app.models.room import Room, Bed
from app.models.admission import Admission
from app.models.booking import Booking
from app.models.enquiry import Enquiry
from app.models.attendance import Attendance
from app.models.finance import FeeReceipt, AccountTransaction
from app.schemas.dashboard import DashboardMetrics, FloorOccupancy

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/metrics", response_model=DashboardMetrics)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    # Total Active Guests
    total_guests = db.query(Guest).filter(Guest.status == "Active").count()
    
    # Rooms & Beds
    total_rooms = db.query(Room).count()
    total_beds = db.query(Bed).count()
    occupied_beds = db.query(Bed).filter(Bed.is_occupied == True).count()
    vacancies = total_beds - occupied_beds
    occupancy_rate = (occupied_beds / total_beds * 100) if total_beds > 0 else 0.0

    # Bookings
    active_bookings = db.query(Booking).filter(Booking.status == "Confirmed").count()

    # Attendance Today
    today = date.today()
    today_attendance_marked = db.query(Attendance).filter(Attendance.date == today).count()
    today_present = db.query(Attendance).filter(
        Attendance.date == today,
        Attendance.status == "Present"
    ).count()

    # Enquiries
    pending_enquiries = db.query(Enquiry).filter(Enquiry.current_status == "Open").count()

    # Financials for Current Month
    first_day_of_month = today.replace(day=1)
    
    # Monthly fee receipts (Income)
    fee_income = db.query(func.sum(FeeReceipt.amount)).filter(
        FeeReceipt.date >= first_day_of_month
    ).scalar() or 0.0

    # Account Transactions: Credit is income, Debit is expense
    account_credits = db.query(func.sum(AccountTransaction.amount)).filter(
        AccountTransaction.date >= first_day_of_month,
        AccountTransaction.entry_type == "Cr"
    ).scalar() or 0.0

    account_debits = db.query(func.sum(AccountTransaction.amount)).filter(
        AccountTransaction.date >= first_day_of_month,
        AccountTransaction.entry_type == "Dr"
    ).scalar() or 0.0

    total_income = fee_income + account_credits
    total_expense = account_debits
    net_profit = total_income - total_expense

    # Floor Breakdown
    floor_stats: List[FloorOccupancy] = []
    floors = db.query(Room.floor).distinct().order_by(Room.floor).all()
    for (fl,) in floors:
        fl_room_ids = db.query(Room.id).filter(Room.floor == fl).all()
        room_ids = [r[0] for r in fl_room_ids]
        fl_total_beds = db.query(Bed).filter(Bed.room_id.in_(room_ids)).count() if room_ids else 0
        fl_occupied_beds = db.query(Bed).filter(Bed.room_id.in_(room_ids), Bed.is_occupied == True).count() if room_ids else 0
        fl_vacant = fl_total_beds - fl_occupied_beds
        fl_pct = (fl_occupied_beds / fl_total_beds * 100) if fl_total_beds > 0 else 0.0
        floor_stats.append(FloorOccupancy(
            floor=fl,
            total_beds=fl_total_beds,
            occupied_beds=fl_occupied_beds,
            vacant_beds=fl_vacant,
            occupancy_percentage=round(fl_pct, 1)
        ))

    # Recent Admissions
    recent_admissions_records = (
        db.query(Admission)
        .order_by(Admission.id.desc())
        .limit(5)
        .all()
    )
    recent_admissions = [
        {
            "id": a.id,
            "guest_name": a.guest.name if a.guest else "Unknown",
            "room_number": a.room.room_number if a.room else "",
            "bed_number": a.bed.bed_number if a.bed else "",
            "admission_date": a.admission_date.isoformat(),
            "monthly_fee": a.monthly_fee,
            "status": a.status,
        }
        for a in recent_admissions_records
    ]

    # Recent Enquiries
    recent_enquiries_records = (
        db.query(Enquiry)
        .order_by(Enquiry.id.desc())
        .limit(5)
        .all()
    )
    recent_enquiries = [
        {
            "id": e.id,
            "name": e.name,
            "mode": e.mode,
            "contact_no": e.contact_no,
            "date": e.date.isoformat(),
            "current_status": e.current_status,
        }
        for e in recent_enquiries_records
    ]

    # Recent Transactions
    recent_tx_records = (
        db.query(AccountTransaction)
        .order_by(AccountTransaction.id.desc())
        .limit(5)
        .all()
    )
    recent_transactions = [
        {
            "id": t.id,
            "date": t.date.isoformat(),
            "particulars": t.particulars,
            "amount": t.amount,
            "payment_channel": t.payment_channel,
            "entry_type": t.entry_type,
        }
        for t in recent_tx_records
    ]

    return DashboardMetrics(
        total_guests=total_guests,
        total_rooms=total_rooms,
        total_beds=total_beds,
        vacancies=vacancies,
        occupied_beds=occupied_beds,
        occupancy_rate=round(occupancy_rate, 1),
        active_bookings=active_bookings,
        today_attendance_marked=today_attendance_marked,
        today_present=today_present,
        pending_enquiries=pending_enquiries,
        total_income_this_month=total_income,
        total_expense_this_month=total_expense,
        net_profit_this_month=net_profit,
        floor_stats=floor_stats,
        recent_admissions=recent_admissions,
        recent_enquiries=recent_enquiries,
        recent_transactions=recent_transactions,
    )
