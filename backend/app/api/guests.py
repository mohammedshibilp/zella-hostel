from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import require_staff_or_admin
from app.models.user import User
from app.models.guest import Guest
from app.models.admission import Admission
from app.schemas.guest import GuestCreate, GuestUpdate, GuestResponse

router = APIRouter(prefix="/guests", tags=["Guests"])


@router.get("", response_model=List[GuestResponse])
def get_guests(
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    query = db.query(Guest)
    if status_filter:
        query = query.filter(Guest.status == status_filter)
    if search:
        term = f"%{search}%"
        query = query.filter(
            (Guest.name.ilike(term)) | (Guest.contact_no.ilike(term)) | (Guest.email.ilike(term))
        )
    
    guests = query.order_by(Guest.id.desc()).all()
    results = []
    for g in guests:
        # Find active admission to attach current room & bed
        active_adm = db.query(Admission).filter(
            Admission.guest_id == g.id,
            Admission.status == "Active"
        ).first()
        r_num = active_adm.room.room_number if (active_adm and active_adm.room) else None
        b_num = active_adm.bed.bed_number if (active_adm and active_adm.bed) else None

        resp = GuestResponse(
            id=g.id,
            name=g.name,
            contact_no=g.contact_no,
            email=g.email,
            occupation=g.occupation,
            guardian_name=g.guardian_name,
            guardian_phone=g.guardian_phone,
            address=g.address,
            id_proof_type=g.id_proof_type,
            id_proof_number=g.id_proof_number,
            status=g.status,
            created_at=g.created_at,
            room_number=r_num,
            bed_number=b_num,
        )
        results.append(resp)
    return results


@router.get("/{guest_id}", response_model=GuestResponse)
def get_guest(
    guest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    g = db.query(Guest).filter(Guest.id == guest_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Guest not found")
    active_adm = db.query(Admission).filter(
        Admission.guest_id == g.id,
        Admission.status == "Active"
    ).first()
    r_num = active_adm.room.room_number if (active_adm and active_adm.room) else None
    b_num = active_adm.bed.bed_number if (active_adm and active_adm.bed) else None

    return GuestResponse(
        id=g.id,
        name=g.name,
        contact_no=g.contact_no,
        email=g.email,
        occupation=g.occupation,
        guardian_name=g.guardian_name,
        guardian_phone=g.guardian_phone,
        address=g.address,
        id_proof_type=g.id_proof_type,
        id_proof_number=g.id_proof_number,
        status=g.status,
        created_at=g.created_at,
        room_number=r_num,
        bed_number=b_num,
    )


@router.post("", response_model=GuestResponse, status_code=status.HTTP_201_CREATED)
def create_guest(
    guest_in: GuestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    guest = Guest(**guest_in.model_dump())
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest


@router.put("/{guest_id}", response_model=GuestResponse)
def update_guest(
    guest_id: int,
    guest_in: GuestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    guest = db.query(Guest).filter(Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    for field, val in guest_in.model_dump(exclude_unset=True).items():
        setattr(guest, field, val)
    db.commit()
    db.refresh(guest)
    return guest
