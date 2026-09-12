from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import require_staff_or_admin
from app.models.user import User
from app.models.enquiry import Enquiry
from app.schemas.enquiry import EnquiryCreate, EnquiryUpdate, EnquiryResponse

router = APIRouter(prefix="/enquiries", tags=["Enquiries"])


@router.get("", response_model=List[EnquiryResponse])
def get_enquiries(
    mode: Optional[str] = None,
    current_status: Optional[str] = None,
    occupation: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    query = db.query(Enquiry)
    if mode:
        query = query.filter(Enquiry.mode == mode)
    if current_status:
        query = query.filter(Enquiry.current_status == current_status)
    if occupation:
        query = query.filter(Enquiry.occupation == occupation)
    if search:
        term = f"%{search}%"
        query = query.filter(
            (Enquiry.name.ilike(term)) | (Enquiry.contact_no.ilike(term))
        )
    return query.order_by(Enquiry.date.desc(), Enquiry.id.desc()).all()


@router.post("", response_model=EnquiryResponse, status_code=status.HTTP_201_CREATED)
def create_enquiry(
    enq_in: EnquiryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    enquiry = Enquiry(**enq_in.model_dump())
    db.add(enquiry)
    db.commit()
    db.refresh(enquiry)
    return enquiry


@router.get("/{enquiry_id}", response_model=EnquiryResponse)
def get_enquiry(
    enquiry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    enquiry = db.query(Enquiry).filter(Enquiry.id == enquiry_id).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return enquiry


@router.put("/{enquiry_id}", response_model=EnquiryResponse)
def update_enquiry(
    enquiry_id: int,
    enq_in: EnquiryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    enquiry = db.query(Enquiry).filter(Enquiry.id == enquiry_id).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    for field, val in enq_in.model_dump(exclude_unset=True).items():
        setattr(enquiry, field, val)
    db.commit()
    db.refresh(enquiry)
    return enquiry


@router.patch("/{enquiry_id}/status", response_model=EnquiryResponse)
def update_enquiry_status(
    enquiry_id: int,
    current_status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    enquiry = db.query(Enquiry).filter(Enquiry.id == enquiry_id).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    enquiry.current_status = current_status
    db.commit()
    db.refresh(enquiry)
    return enquiry


@router.delete("/{enquiry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enquiry(
    enquiry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    enquiry = db.query(Enquiry).filter(Enquiry.id == enquiry_id).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    db.delete(enquiry)
    db.commit()
    return None
