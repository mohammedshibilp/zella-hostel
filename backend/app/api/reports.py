from datetime import date, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.api.deps import require_staff_or_admin
from app.models.user import User
from app.models.room import Room, Bed
from app.models.guest import Guest
from app.models.admission import Admission
from app.models.finance import FeeReceipt, AccountTransaction

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/occupancy")
def get_occupancy_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    total_rooms = db.query(Room).count()
    total_beds = db.query(Bed).count()
    occupied_beds = db.query(Bed).filter(Bed.is_occupied == True).count()
    vacant_beds = total_beds - occupied_beds

    # By floor
    floors_data = []
    floors = db.query(Room.floor).distinct().order_by(Room.floor).all()
    for (fl,) in floors:
        fl_room_ids = [r[0] for r in db.query(Room.id).filter(Room.floor == fl).all()]
        fl_total = db.query(Bed).filter(Bed.room_id.in_(fl_room_ids)).count() if fl_room_ids else 0
        fl_occ = db.query(Bed).filter(Bed.room_id.in_(fl_room_ids), Bed.is_occupied == True).count() if fl_room_ids else 0
        floors_data.append({
            "floor": f"Floor {fl}",
            "total_beds": fl_total,
            "occupied_beds": fl_occ,
            "vacant_beds": fl_total - fl_occ,
            "occupancy_pct": round((fl_occ / fl_total * 100) if fl_total else 0, 1)
        })

    # By room type
    types_data = []
    room_types = db.query(Room.room_type).distinct().all()
    for (rt,) in room_types:
        rt_room_ids = [r[0] for r in db.query(Room.id).filter(Room.room_type == rt).all()]
        rt_total = db.query(Bed).filter(Bed.room_id.in_(rt_room_ids)).count() if rt_room_ids else 0
        rt_occ = db.query(Bed).filter(Bed.room_id.in_(rt_room_ids), Bed.is_occupied == True).count() if rt_room_ids else 0
        types_data.append({
            "room_type": rt,
            "total_beds": rt_total,
            "occupied_beds": rt_occ,
            "vacant_beds": rt_total - rt_occ,
            "occupancy_pct": round((rt_occ / rt_total * 100) if rt_total else 0, 1)
        })

    return {
        "total_rooms": total_rooms,
        "total_beds": total_beds,
        "occupied_beds": occupied_beds,
        "vacant_beds": vacant_beds,
        "occupancy_rate": round((occupied_beds / total_beds * 100) if total_beds else 0, 1),
        "floor_breakdown": floors_data,
        "type_breakdown": types_data,
    }


@router.get("/financial")
def get_financial_report(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    # Monthly collection comparison for past N months
    today = date.today()
    monthly_data = []
    
    for i in range(months - 1, -1, -1):
        # Calculate year and month
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        
        start_date = date(y, m, 1)
        if m == 12:
            end_date = date(y + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(y, m + 1, 1) - timedelta(days=1)

        month_label = start_date.strftime("%b %Y")

        # Collections from Fee Receipts
        fee_amt = db.query(func.sum(FeeReceipt.amount)).filter(
            FeeReceipt.date >= start_date,
            FeeReceipt.date <= end_date
        ).scalar() or 0.0

        # Credits & Debits from Accounts
        tx_credits = db.query(func.sum(AccountTransaction.amount)).filter(
            AccountTransaction.date >= start_date,
            AccountTransaction.date <= end_date,
            AccountTransaction.entry_type == "Cr"
        ).scalar() or 0.0

        tx_debits = db.query(func.sum(AccountTransaction.amount)).filter(
            AccountTransaction.date >= start_date,
            AccountTransaction.date <= end_date,
            AccountTransaction.entry_type == "Dr"
        ).scalar() or 0.0

        income = fee_amt + tx_credits
        expense = tx_debits
        net = income - expense

        monthly_data.append({
            "month": month_label,
            "income": round(income, 2),
            "expense": round(expense, 2),
            "net": round(net, 2)
        })

    return {"monthly_financials": monthly_data}
