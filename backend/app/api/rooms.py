from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import require_staff_or_admin, require_admin
from app.models.user import User
from app.models.room import Room, Bed
from app.models.admission import Admission
from app.models.booking import Booking
from app.schemas.room import (
    RoomBase,
    RoomCreate,
    RoomUpdate,
    RoomDetailResponse,
    RoomChartSummary,
    BedBase,
    BedCreate,
    BedResponse,
)

router = APIRouter(prefix="/rooms", tags=["Rooms & Beds"])


def _build_bed_responses(beds, active_admissions_map, active_bookings_map):
    resps = []
    for b in beds:
        b_dict = {
            "id": b.id,
            "room_id": b.room_id,
            "bed_number": b.bed_number,
            "is_occupied": b.is_occupied,
            "status": b.status,
            "notes": b.notes,
            "current_guest_name": None,
            "current_guest_contact": None,
            "admission_date": None,
            "package_name": None,
            "monthly_fee": None,
            "reserved_guest_name": None,
        }
        adm = active_admissions_map.get(b.id)
        if adm:
            if adm.guest:
                b_dict["current_guest_name"] = adm.guest.name
                b_dict["current_guest_contact"] = adm.guest.contact_no
            if adm.admission_date:
                b_dict["admission_date"] = str(adm.admission_date)
            if adm.package:
                b_dict["package_name"] = adm.package.name
            b_dict["monthly_fee"] = adm.monthly_fee
        book = active_bookings_map.get(b.id)
        if book:
            b_dict["reserved_guest_name"] = book.guest_name
        resps.append(BedResponse(**b_dict))
    return resps


@router.get("", response_model=List[RoomDetailResponse])
def get_rooms(
    floor: int = None,
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    query = db.query(Room)
    if floor:
        query = query.filter(Room.floor == floor)
    if status_filter:
        query = query.filter(Room.status == status_filter)
    
    rooms = query.order_by(Room.floor, Room.room_number).all()

    # Pre-fetch active admissions & bookings to map to beds
    active_admissions = db.query(Admission).filter(Admission.status == "Active").all()
    adm_map = {a.bed_id: a for a in active_admissions}

    active_bookings = db.query(Booking).filter(Booking.status.in_(["Confirmed", "Pending"])).all()
    book_map = {b.bed_id: b for b in active_bookings}

    results = []
    for r in rooms:
        occupied = sum(1 for b in r.beds if b.is_occupied)
        vacant = len(r.beds) - occupied
        results.append(RoomDetailResponse(
            id=r.id,
            room_number=r.room_number,
            floor=r.floor,
            capacity=r.capacity,
            room_type=r.room_type,
            status=r.status,
            notes=r.notes,
            created_at=r.created_at,
            beds=_build_bed_responses(r.beds, adm_map, book_map),
            occupied_count=occupied,
            vacant_count=vacant,
        ))
    return results


@router.get("/chart", response_model=RoomChartSummary)
def get_room_chart_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    total_rooms = db.query(Room).count()
    total_beds = db.query(Bed).count()
    occupied_beds = db.query(Bed).filter(Bed.is_occupied == True).count()
    vacant_beds = total_beds - occupied_beds

    floors = db.query(Room.floor).distinct().order_by(Room.floor).all()
    floor_summaries = {}
    for (fl,) in floors:
        fl_room_ids = [r[0] for r in db.query(Room.id).filter(Room.floor == fl).all()]
        fl_total = db.query(Bed).filter(Bed.room_id.in_(fl_room_ids)).count() if fl_room_ids else 0
        fl_occ = db.query(Bed).filter(Bed.room_id.in_(fl_room_ids), Bed.is_occupied == True).count() if fl_room_ids else 0
        floor_summaries[f"Floor {fl}"] = {
            "total_beds": fl_total,
            "occupied_beds": fl_occ,
            "vacant_beds": fl_total - fl_occ,
        }

    return RoomChartSummary(
        total_rooms=total_rooms,
        total_beds=total_beds,
        occupied_beds=occupied_beds,
        vacant_beds=vacant_beds,
        floor_summaries=floor_summaries
    )


@router.get("/{room_id}", response_model=RoomDetailResponse)
def get_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    occupied = sum(1 for b in room.beds if b.is_occupied)
    vacant = len(room.beds) - occupied
    bed_ids = [b.id for b in room.beds]
    adm_map = {a.bed_id: a for a in db.query(Admission).filter(Admission.bed_id.in_(bed_ids), Admission.status == "Active").all()} if bed_ids else {}
    book_map = {b.bed_id: b for b in db.query(Booking).filter(Booking.bed_id.in_(bed_ids), Booking.status.in_(["Confirmed", "Pending"])).all()} if bed_ids else {}

    return RoomDetailResponse(
        id=room.id,
        room_number=room.room_number,
        floor=room.floor,
        capacity=room.capacity,
        room_type=room.room_type,
        status=room.status,
        notes=room.notes,
        created_at=room.created_at,
        beds=_build_bed_responses(room.beds, adm_map, book_map),
        occupied_count=occupied,
        vacant_count=vacant,
    )


@router.post("", response_model=RoomDetailResponse, status_code=status.HTTP_201_CREATED)
def create_room(
    room_in: RoomCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    existing = db.query(Room).filter(Room.room_number == room_in.room_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Room number already exists")
    
    room = Room(
        room_number=room_in.room_number,
        floor=room_in.floor,
        capacity=room_in.capacity,
        room_type=room_in.room_type,
        status=room_in.status,
        notes=room_in.notes,
    )
    db.add(room)
    db.flush()

    letters = ["A", "B", "C", "D", "E"]
    for i in range(room.capacity):
        bed = Bed(
            room_id=room.id,
            bed_number=f"{room.room_number}-{letters[i]}",
            is_occupied=False,
            status="Available"
        )
        db.add(bed)

    db.commit()
    db.refresh(room)
    return RoomDetailResponse(
        id=room.id,
        room_number=room.room_number,
        floor=room.floor,
        capacity=room.capacity,
        room_type=room.room_type,
        status=room.status,
        notes=room.notes,
        created_at=room.created_at,
        beds=[BedResponse.model_validate(b) for b in room.beds],
        occupied_count=0,
        vacant_count=len(room.beds),
    )


@router.patch("/beds/{bed_id}/status", response_model=BedResponse)
def update_bed_status(
    bed_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    bed = db.query(Bed).filter(Bed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    bed.status = status
    if status == "Occupied":
        bed.is_occupied = True
    elif status == "Available":
        bed.is_occupied = False
    db.commit()
    db.refresh(bed)
    return bed
