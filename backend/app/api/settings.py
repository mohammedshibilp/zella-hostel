from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import require_staff_or_admin, require_admin
from app.models.user import User
from app.models.room import Room
from app.models.settings import MaintenanceRecord, HostelSetting
from app.schemas.settings import (
    MaintenanceRecordCreate,
    MaintenanceRecordUpdate,
    MaintenanceRecordResponse,
    HostelSettingCreate,
    HostelSettingResponse,
)

router = APIRouter(prefix="/settings", tags=["Settings & Maintenance"])


# Maintenance Records ("Others" in navigation)
@router.get("/maintenance", response_model=List[MaintenanceRecordResponse])
def get_maintenance_records(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    query = db.query(MaintenanceRecord)
    if status_filter:
        query = query.filter(MaintenanceRecord.status == status_filter)
    records = query.order_by(MaintenanceRecord.reported_date.desc(), MaintenanceRecord.id.desc()).all()
    results = []
    for r in records:
        results.append(MaintenanceRecordResponse(
            id=r.id,
            room_id=r.room_id,
            title=r.title,
            description=r.description,
            cost=r.cost,
            status=r.status,
            reported_date=r.reported_date,
            resolved_date=r.resolved_date,
            created_at=r.created_at,
            room_number=r.room.room_number if r.room else None
        ))
    return results


@router.post("/maintenance", response_model=MaintenanceRecordResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_record(
    item_in: MaintenanceRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    room = db.query(Room).filter(Room.id == item_in.room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    rec = MaintenanceRecord(**item_in.model_dump())
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return MaintenanceRecordResponse(
        id=rec.id,
        room_id=rec.room_id,
        title=rec.title,
        description=rec.description,
        cost=rec.cost,
        status=rec.status,
        reported_date=rec.reported_date,
        resolved_date=rec.resolved_date,
        created_at=rec.created_at,
        room_number=room.room_number
    )


@router.patch("/maintenance/{record_id}/status", response_model=MaintenanceRecordResponse)
def update_maintenance_status(
    record_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    rec = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    rec.status = status
    db.commit()
    db.refresh(rec)
    return MaintenanceRecordResponse(
        id=rec.id,
        room_id=rec.room_id,
        title=rec.title,
        description=rec.description,
        cost=rec.cost,
        status=rec.status,
        reported_date=rec.reported_date,
        resolved_date=rec.resolved_date,
        created_at=rec.created_at,
        room_number=rec.room.room_number if rec.room else None
    )


# General Hostel Settings
@router.get("/general", response_model=List[HostelSettingResponse])
def get_hostel_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    return db.query(HostelSetting).all()


@router.put("/general/{key}", response_model=HostelSettingResponse)
def update_hostel_setting(
    key: str,
    value: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    setting = db.query(HostelSetting).filter(HostelSetting.key == key).first()
    if not setting:
        setting = HostelSetting(key=key, value=value)
        db.add(setting)
    else:
        setting.value = value
    db.commit()
    db.refresh(setting)
    return setting
