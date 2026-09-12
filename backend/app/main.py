from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.session import engine, Base
import app.models  # ensure all models are registered

# Import routers
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.rooms import router as rooms_router
from app.api.packages import router as packages_router
from app.api.enquiries import router as enquiries_router
from app.api.guests import router as guests_router
from app.api.admissions import router as admissions_router
from app.api.bookings import router as bookings_router
from app.api.attendance import router as attendance_router
from app.api.fee_receipts import router as fee_receipts_router
from app.api.accounts import router as accounts_router
from app.api.settings import router as settings_router
from app.api.reports import router as reports_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup if not present
    Base.metadata.create_all(bind=engine)
    try:
        from app.database.seed import seed_database
        seed_database()
    except Exception as e:
        pass
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# CORS Middleware - Permissive for localhost, 127.0.0.1, LAN IPs, and any web origins
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}

# Mount API Routers
v1 = settings.API_V1_STR
app.include_router(auth_router, prefix=v1)
app.include_router(dashboard_router, prefix=v1)
app.include_router(rooms_router, prefix=v1)
app.include_router(packages_router, prefix=v1)
app.include_router(enquiries_router, prefix=v1)
app.include_router(guests_router, prefix=v1)
app.include_router(admissions_router, prefix=v1)
app.include_router(bookings_router, prefix=v1)
app.include_router(attendance_router, prefix=v1)
app.include_router(fee_receipts_router, prefix=v1)
app.include_router(accounts_router, prefix=v1)
app.include_router(settings_router, prefix=v1)
app.include_router(reports_router, prefix=v1)
