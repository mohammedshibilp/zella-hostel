from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
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
    BedAdd,
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
    floor: Optional[int] = None,
    status_filter: Optional[str] = None,
    room_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    query = db.query(Room)
    if floor is not None:
        query = query.filter(Room.floor == floor)
    if status_filter:
        query = query.filter(Room.status == status_filter)
    if room_type:
        query = query.filter(Room.room_type == room_type)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Room.room_number.ilike(search_term),
                Room.room_type.ilike(search_term),
                Room.notes.ilike(search_term),
            )
        )

    rooms = query.order_by(Room.floor.asc(), Room.room_number.asc()).all()

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
            price=r.price or 0.0,
            status=r.status,
            notes=r.notes,
            created_at=r.created_at,
            beds=_build_bed_responses(r.beds, adm_map, book_map),
            occupied_count=occupied,
            vacant_count=vacant,
        ))
    return results


@router.get("/available", response_model=List[RoomDetailResponse])
def get_available_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    """Retrieve rooms that have at least one vacant available bed and are not in Maintenance/Inactive."""
    rooms = db.query(Room).filter(Room.status.in_(["Available", "Active"])).order_by(Room.floor.asc(), Room.room_number.asc()).all()

    active_admissions = db.query(Admission).filter(Admission.status == "Active").all()
    adm_map = {a.bed_id: a for a in active_admissions}

    active_bookings = db.query(Booking).filter(Booking.status.in_(["Confirmed", "Pending"])).all()
    book_map = {b.bed_id: b for b in active_bookings}

    results = []
    for r in rooms:
        occupied = sum(1 for b in r.beds if b.is_occupied)
        available_beds_count = sum(1 for b in r.beds if not b.is_occupied and b.status == "Available" and b.id not in book_map)
        if available_beds_count > 0:
            results.append(RoomDetailResponse(
                id=r.id,
                room_number=r.room_number,
                floor=r.floor,
                capacity=r.capacity,
                room_type=r.room_type,
                price=r.price or 0.0,
                status=r.status,
                notes=r.notes,
                created_at=r.created_at,
                beds=_build_bed_responses(r.beds, adm_map, book_map),
                occupied_count=occupied,
                vacant_count=len(r.beds) - occupied,
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
        price=room.price or 0.0,
        status=room.status,
        notes=room.notes,
        created_at=room.created_at,
        beds=_build_bed_responses(room.beds, adm_map, book_map),
        occupied_count=occupied,
        vacant_count=vacant,
    )


@router.get("/{room_id}/beds/available", response_model=List[BedResponse])
def get_available_beds_for_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Exclude occupied beds and active bookings
    active_booking_bed_ids = [
        b.bed_id for b in db.query(Booking.bed_id).filter(
            Booking.room_id == room_id,
            Booking.status.in_(["Confirmed", "Pending"])
        ).all()
    ]

    available_beds = db.query(Bed).filter(
        Bed.room_id == room_id,
        Bed.is_occupied == False,
        Bed.status == "Available",
        ~Bed.id.in_(active_booking_bed_ids) if active_booking_bed_ids else True
    ).order_by(Bed.bed_number.asc()).all()

    return [BedResponse.model_validate(b) for b in available_beds]


@router.post("", response_model=RoomDetailResponse, status_code=status.HTTP_201_CREATED)
def create_room(
    room_in: RoomCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    clean_room_number = room_in.room_number.strip()
    if not clean_room_number:
        raise HTTPException(status_code=400, detail="Room number is required")

    existing = db.query(Room).filter(func.lower(Room.room_number) == func.lower(clean_room_number)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Room number '{clean_room_number}' already exists")

    if room_in.capacity < 1 or room_in.capacity > 50:
        raise HTTPException(status_code=400, detail="Bed capacity must be between 1 and 50")

    if room_in.floor < 0:
        raise HTTPException(status_code=400, detail="Floor number cannot be negative")

    room = Room(
        room_number=clean_room_number,
        floor=room_in.floor,
        capacity=room_in.capacity,
        room_type=room_in.room_type or "Standard Sharing",
        price=room_in.price or 0.0,
        status=room_in.status or "Available",
        notes=room_in.notes,
    )
    db.add(room)
    db.flush()

    # Automatically generate beds for the room
    for i in range(1, room.capacity + 1):
        bed = Bed(
            room_id=room.id,
            bed_number=f"{room.room_number}-Bed {i}",
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
        price=room.price or 0.0,
        status=room.status,
        notes=room.notes,
        created_at=room.created_at,
        beds=[BedResponse.model_validate(b) for b in room.beds],
        occupied_count=0,
        vacant_count=len(room.beds),
    )


@router.put("/{room_id}", response_model=RoomDetailResponse)
@router.patch("/{room_id}", response_model=RoomDetailResponse)
def update_room(
    room_id: int,
    room_in: RoomUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    old_room_number = room.room_number

    # 1. Update room number if changed
    if room_in.room_number is not None:
        clean_num = room_in.room_number.strip()
        if clean_num and clean_num.lower() != room.room_number.lower():
            conflict = db.query(Room).filter(
                func.lower(Room.room_number) == func.lower(clean_num),
                Room.id != room_id
            ).first()
            if conflict:
                raise HTTPException(status_code=400, detail=f"Room number '{clean_num}' is already in use")
            room.room_number = clean_num
            # Update bed numbers if they were prefixed with old room number
            for b in room.beds:
                if b.bed_number.startswith(f"{old_room_number}-"):
                    b.bed_number = b.bed_number.replace(f"{old_room_number}-", f"{clean_num}-", 1)

    if room_in.floor is not None:
        if room_in.floor < 0:
            raise HTTPException(status_code=400, detail="Floor number cannot be negative")
        room.floor = room_in.floor

    if room_in.room_type is not None:
        room.room_type = room_in.room_type

    if room_in.price is not None:
        room.price = room_in.price

    if room_in.status is not None:
        room.status = room_in.status

    if room_in.notes is not None:
        room.notes = room_in.notes

    # 2. Update capacity if changed
    if room_in.capacity is not None and room_in.capacity != room.capacity:
        if room_in.capacity < 1 or room_in.capacity > 50:
            raise HTTPException(status_code=400, detail="Bed capacity must be between 1 and 50")

        current_bed_count = len(room.beds)
        if room_in.capacity > current_bed_count:
            # Add beds
            for i in range(current_bed_count + 1, room_in.capacity + 1):
                bed = Bed(
                    room_id=room.id,
                    bed_number=f"{room.room_number}-Bed {i}",
                    is_occupied=False,
                    status="Available"
                )
                db.add(bed)
        elif room_in.capacity < current_bed_count:
            # Need to remove (current_bed_count - room_in.capacity) beds from the end
            beds_to_consider = room.beds[room_in.capacity:]
            for b in beds_to_consider:
                if b.is_occupied or b.status == "Occupied":
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot reduce capacity to {room_in.capacity}: Bed '{b.bed_number}' is currently occupied."
                    )
                # Check active booking or admission
                active_adm = db.query(Admission).filter(Admission.bed_id == b.id, Admission.status == "Active").first()
                if active_adm:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot reduce capacity: Bed '{b.bed_number}' has an active resident."
                    )
                active_bkg = db.query(Booking).filter(Booking.bed_id == b.id, Booking.status.in_(["Confirmed", "Pending"])).first()
                if active_bkg:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot reduce capacity: Bed '{b.bed_number}' is reserved for a future booking."
                    )

            # Safe to remove excess beds
            for b in beds_to_consider:
                db.delete(b)

        room.capacity = room_in.capacity

    db.commit()
    db.refresh(room)

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
        price=room.price or 0.0,
        status=room.status,
        notes=room.notes,
        created_at=room.created_at,
        beds=_build_bed_responses(room.beds, adm_map, book_map),
        occupied_count=occupied,
        vacant_count=vacant,
    )


@router.delete("/{room_id}", status_code=status.HTTP_200_OK)
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Safety checks
    occupied_beds = [b.bed_number for b in room.beds if b.is_occupied or b.status == "Occupied"]
    if occupied_beds:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete Room {room.room_number}: Bed(s) {', '.join(occupied_beds)} are currently occupied. Please check out resident guests first."
        )

    active_adm = db.query(Admission).filter(Admission.room_id == room_id, Admission.status == "Active").first()
    if active_adm:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete Room {room.room_number}: It currently has active resident admissions."
        )

    active_bkg = db.query(Booking).filter(Booking.room_id == room_id, Booking.status.in_(["Confirmed", "Pending"])).first()
    if active_bkg:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete Room {room.room_number}: It has an active booking reservation ({active_bkg.guest_name}). Please cancel or reassign the booking first."
        )

    # Check historical records to prevent foreign key integrity violations
    has_history = db.query(Admission).filter(Admission.room_id == room_id).first() or \
                  db.query(Booking).filter(Booking.room_id == room_id).first()
    if has_history:
        raise HTTPException(
            status_code=400,
            detail=f"Room {room.room_number} has historical admission or booking records linked to it. To maintain audit and accounting integrity, set its status to 'Inactive' instead of deleting."
        )

    room_num = room.room_number
    db.delete(room)
    db.commit()
    return {"message": f"Room {room_num} and all its beds have been deleted successfully."}


@router.post("/{room_id}/beds", response_model=BedResponse, status_code=status.HTTP_201_CREATED)
def add_bed_to_room(
    room_id: int,
    bed_in: BedAdd,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if bed_in.bed_number:
        bed_num = bed_in.bed_number.strip()
    else:
        bed_num = f"{room.room_number}-Bed {len(room.beds) + 1}"

    existing = db.query(Bed).filter(Bed.room_id == room_id, Bed.bed_number == bed_num).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Bed '{bed_num}' already exists in Room {room.room_number}")

    bed = Bed(
        room_id=room.id,
        bed_number=bed_num,
        is_occupied=False,
        status="Available",
        notes=bed_in.notes,
    )
    db.add(bed)
    room.capacity = len(room.beds) + 1
    db.commit()
    db.refresh(bed)
    return BedResponse.model_validate(bed)


@router.delete("/{room_id}/beds/{bed_id}", status_code=status.HTTP_200_OK)
def delete_bed(
    room_id: int,
    bed_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    bed = db.query(Bed).filter(Bed.id == bed_id, Bed.room_id == room_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found in this room")

    if bed.is_occupied or bed.status == "Occupied":
        raise HTTPException(status_code=400, detail=f"Cannot delete Bed {bed.bed_number}: It is currently occupied.")

    active_adm = db.query(Admission).filter(Admission.bed_id == bed_id, Admission.status == "Active").first()
    if active_adm:
        raise HTTPException(status_code=400, detail=f"Cannot delete Bed {bed.bed_number}: It has an active resident.")

    active_bkg = db.query(Booking).filter(Booking.bed_id == bed_id, Booking.status.in_(["Confirmed", "Pending"])).first()
    if active_bkg:
        raise HTTPException(status_code=400, detail=f"Cannot delete Bed {bed.bed_number}: It has an active booking reservation.")

    has_history = db.query(Admission).filter(Admission.bed_id == bed_id).first() or \
                  db.query(Booking).filter(Booking.bed_id == bed_id).first()
    if has_history:
        raise HTTPException(
            status_code=400,
            detail=f"Bed {bed.bed_number} has historical admission records. Mark its status as 'Maintenance' instead of deleting."
        )

    room = bed.room
    bed_num = bed.bed_number
    db.delete(bed)
    if room and room.capacity > 1:
        room.capacity = len(room.beds) - 1
    db.commit()
    return {"message": f"Bed {bed_num} deleted successfully."}


@router.patch("/beds/{bed_id}/status", response_model=BedResponse)
def update_bed_status(
    bed_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    valid_statuses = ["Available", "Maintenance", "Occupied", "Reserved"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid bed status. Allowed: {', '.join(valid_statuses)}")

    bed = db.query(Bed).filter(Bed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")

    # If attempting to set to Available, verify there's no active resident
    if status == "Available":
        active_adm = db.query(Admission).filter(Admission.bed_id == bed_id, Admission.status == "Active").first()
        if active_adm:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot set Bed {bed.bed_number} to Available while guest '{active_adm.guest.name if active_adm.guest else 'Resident'}' is actively checked in. Please check out the guest first."
            )
        bed.is_occupied = False
    elif status == "Occupied":
        bed.is_occupied = True
    elif status in ["Maintenance", "Reserved"]:
        # If someone is in maintenance or reserved, is_occupied is False unless active resident
        active_adm = db.query(Admission).filter(Admission.bed_id == bed_id, Admission.status == "Active").first()
        if not active_adm:
            bed.is_occupied = False

    bed.status = status
    db.commit()
    db.refresh(bed)
    return BedResponse.model_validate(bed)
