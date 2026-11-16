import logging
from app.database.session import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.room import Room, Bed
from app.models.package import Package
from app.models.settings import HostelSetting

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_database():
    logger.info("Creating database tables if not exist...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Seed Users (Admin & Staff)
        admin_user = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not admin_user:
            admin_user = User(
                email=settings.ADMIN_EMAIL,
                full_name="Hostel Administrator",
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                role=UserRole.ADMIN.value,
                is_active=True,
            )
            db.add(admin_user)
            logger.info(f"Created default Admin user: {settings.ADMIN_EMAIL}")

        staff_user = db.query(User).filter(User.email == settings.STAFF_EMAIL).first()
        if not staff_user:
            staff_user = User(
                email=settings.STAFF_EMAIL,
                full_name="Front Desk Staff",
                hashed_password=get_password_hash(settings.STAFF_PASSWORD),
                role=UserRole.STAFF.value,
                is_active=True,
            )
            db.add(staff_user)
            logger.info(f"Created default Staff user: {settings.STAFF_EMAIL}")

        # 2. Seed Default Packages
        default_packages = [
            {
                "name": "Standard Double Sharing",
                "monthly_fee": 6500.0,
                "security_deposit": 5000.0,
                "amenities": "High-Speed WiFi, Hot Water, 3 Meals, Daily Housekeeping",
                "description": "Comfortable 2-person room with attached washroom and study tables."
            },
            {
                "name": "Deluxe Double Sharing (AC)",
                "monthly_fee": 8500.0,
                "security_deposit": 7000.0,
                "amenities": "Air Conditioning, High-Speed WiFi, Hot Water, 3 Meals, Laundry",
                "description": "Premium air-conditioned 2-person room with balcony and wardrobe."
            },
            {
                "name": "Triple Sharing Economy",
                "monthly_fee": 5200.0,
                "security_deposit": 4000.0,
                "amenities": "High-Speed WiFi, Hot Water, 3 Meals, Security",
                "description": "Affordable 3-person room ideal for college students and interns."
            },
        ]

        for pkg_data in default_packages:
            existing_pkg = db.query(Package).filter(Package.name == pkg_data["name"]).first()
            if not existing_pkg:
                pkg = Package(**pkg_data)
                db.add(pkg)
                logger.info(f"Created package: {pkg_data['name']}")

        # 3. Rooms & Beds: Removed hardcoded demo seed.
        # Rooms and beds are managed dynamically by the admin via Room Management.

        # 4. Seed Hostel Settings
        default_settings = [
            ("hostel_name", "Zella Premium Hostel & Residences", "Hostel Commercial Name"),
            ("hostel_address", "42 Residency Road, Knowledge Park, Tech City", "Hostel Address"),
            ("contact_phone", "+91 98765 43210", "Official Contact Number"),
            ("contact_email", "contact@zellahostel.com", "Official Email"),
            ("curfew_time", "22:00", "Hostel Gate Closing Time"),
        ]
        for key, val, desc in default_settings:
            existing_setting = db.query(HostelSetting).filter(HostelSetting.key == key).first()
            if not existing_setting:
                setting = HostelSetting(key=key, value=val, description=desc)
                db.add(setting)

        db.commit()
        logger.info("Database seeding completed successfully!")
    except Exception as e:
        db.rollback()
        logger.error(f"Error during database seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
