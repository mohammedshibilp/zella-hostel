from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.database.session import get_db
from app.api.deps import require_staff_or_admin
from app.models.user import User
from app.models.room import Room, Bed
from app.models.guest import Guest
from app.models.admission import Admission
from app.models.booking import Booking
from app.models.finance import AccountTransaction
from app.schemas.booking import BookingCreate, BookingUpdate, BookingResponse

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.get("", response_model=List[BookingResponse])
def get_bookings(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    query = db.query(Booking)
    if status_filter:
        query = query.filter(Booking.status == status_filter)
    return query.order_by(Booking.check_in_date.asc(), Booking.id.desc()).all()


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking_in: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    # Verify bed
    bed = db.query(Bed).filter(Bed.id == booking_in.bed_id, Bed.room_id == booking_in.room_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Selected bed not found in room")

    if bed.is_occupied:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bed {bed.bed_number} is currently occupied."
        )

    # Check overlapping confirmed bookings for same bed
    existing_booking = db.query(Booking).filter(
        Booking.bed_id == booking_in.bed_id,
        Booking.status == "Confirmed"
    ).first()
    if existing_booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bed {bed.bed_number} is already booked for another guest ({existing_booking.guest_name})."
        )

    booking = Booking(**booking_in.model_dump())
    db.add(booking)
    # Mark bed as Reserved
    bed.status = "Reserved"
    db.flush()

    # Record advance amount in accounts if > 0
    if booking.advance_amount > 0:
        advance_tx = AccountTransaction(
            date=booking.booking_date,
            transaction_type="Plain",
            particulars=f"Booking Advance from {booking.guest_name} (Room {bed.room.room_number}, Bed {bed.bed_number})",
            amount=booking.advance_amount,
            payment_channel="Cash",
            entry_type="Cr",
            reference_no=f"BKG-ADV-{booking.id}"
        )
        db.add(advance_tx)

    db.commit()
    db.refresh(booking)
    return booking


@router.patch("/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != "Confirmed":
        raise HTTPException(status_code=400, detail="Only confirmed bookings can be cancelled")
    
    booking.status = "Cancelled"
    # Release reserved bed if not occupied
    bed = db.query(Bed).filter(Bed.id == booking.bed_id).first()
    if bed and bed.status == "Reserved":
        bed.status = "Available"

    db.commit()
    db.refresh(booking)
    return booking


@router.post("/{booking_id}/check-in", response_model=BookingResponse)
def check_in_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != "Confirmed":
        raise HTTPException(status_code=400, detail=f"Cannot check in booking with status '{booking.status}'")

    bed = db.query(Bed).filter(Bed.id == booking.bed_id).first()
    if not bed or bed.is_occupied:
        raise HTTPException(status_code=400, detail="Assigned bed is no longer available")

    # Create Guest record
    guest = Guest(
        name=booking.guest_name,
        contact_no=booking.contact_no,
        email=booking.email,
        status="Active"
    )
    db.add(guest)
    db.flush()

    monthly_fee = booking.package.monthly_fee if booking.package else 6500.0
    security_deposit = booking.package.security_deposit if booking.package else 5000.0

    # Create Admission
    admission = Admission(
        guest_id=guest.id,
        room_id=booking.room_id,
        bed_id=booking.bed_id,
        package_id=booking.package_id,
        admission_date=date.today(),
        security_deposit=security_deposit,
        monthly_fee=monthly_fee,
        status="Active",
        notes=f"Converted from Booking #{booking.id}"
    )
    db.add(admission)

    # Mark bed occupied
    bed.is_occupied = True
    bed.status = "Occupied"

    # Update booking
    booking.status = "CheckedIn"

    db.commit()
    db.refresh(booking)
    return booking
