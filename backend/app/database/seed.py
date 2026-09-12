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

        # 3. Seed Exactly 23 Rooms:
        # Floor 1: 101 to 110 (10 rooms)
        # Floor 2: 201 to 210 (10 rooms)
        # Floor 3: 301 to 303 (3 rooms)
        # Total = 23 rooms
        rooms_spec = []
        for r_num in range(101, 111):
            rooms_spec.append({"room_number": str(r_num), "floor": 1, "capacity": 2, "room_type": "Double Sharing"})
        for r_num in range(201, 211):
            rooms_spec.append({"room_number": str(r_num), "floor": 2, "capacity": 2, "room_type": "Double Sharing"})
        for r_num in range(301, 304):
            rooms_spec.append({"room_number": str(r_num), "floor": 3, "capacity": 3, "room_type": "Triple Sharing"})

        total_seeded_rooms = 0
        total_seeded_beds = 0

        for r_spec in rooms_spec:
            room = db.query(Room).filter(Room.room_number == r_spec["room_number"]).first()
            if not room:
                room = Room(
                    room_number=r_spec["room_number"],
                    floor=r_spec["floor"],
                    capacity=r_spec["capacity"],
                    room_type=r_spec["room_type"],
                    status="Available",
                    notes=f"Floor {r_spec['floor']} - {r_spec['room_type']}"
                )
                db.add(room)
                db.flush()  # to get room.id

                # Create beds for the room
                letters = ["A", "B", "C", "D"]
                for b_idx in range(r_spec["capacity"]):
                    bed_label = f"{r_spec['room_number']}-{letters[b_idx]}"
                    bed = Bed(
                        room_id=room.id,
                        bed_number=bed_label,
                        is_occupied=False,
                        status="Available"
                    )
                    db.add(bed)
                    total_seeded_beds += 1
                total_seeded_rooms += 1

        if total_seeded_rooms > 0:
            logger.info(f"Seeded {total_seeded_rooms} rooms and {total_seeded_beds} beds.")
        else:
            logger.info("Rooms and beds already seeded.")

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
