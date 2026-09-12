from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.api.deps import require_staff_or_admin, require_admin
from app.models.user import User
from app.models.package import Package
from app.schemas.package import PackageCreate, PackageUpdate, PackageResponse

router = APIRouter(prefix="/packages", tags=["Packages"])


@router.get("", response_model=List[PackageResponse])
def get_packages(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff_or_admin)
):
    query = db.query(Package)
    if active_only:
        query = query.filter(Package.is_active == True)
    return query.all()


@router.post("", response_model=PackageResponse, status_code=status.HTTP_201_CREATED)
def create_package(
    pkg_in: PackageCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    existing = db.query(Package).filter(Package.name == pkg_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Package with this name already exists")
    pkg = Package(**pkg_in.model_dump())
    db.add(pkg)
    db.commit()
    db.refresh(pkg)
    return pkg


@router.put("/{pkg_id}", response_model=PackageResponse)
def update_package(
    pkg_id: int,
    pkg_in: PackageUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    pkg = db.query(Package).filter(Package.id == pkg_id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    for field, val in pkg_in.model_dump(exclude_unset=True).items():
        setattr(pkg, field, val)
    db.commit()
    db.refresh(pkg)
    return pkg
