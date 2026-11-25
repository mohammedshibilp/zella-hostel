import uuid
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.utils.billing import (
    calculate_billing_period,
    calculate_next_due_date,
    calculate_cycle_for_date,
)

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_headers():
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def staff_headers():
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.STAFF_EMAIL, "password": settings.STAFF_PASSWORD},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_billing_date_calculations_unit():
    """Verify month-end clamping and dynamic cycles following anchor date."""
    # 1. 22 November -> Next Due 22 December, Period: 22 Nov to 21 Dec
    s, e, d = calculate_billing_period(date(2026, 11, 22))
    assert s == date(2026, 11, 22)
    assert e == date(2026, 12, 21)
    assert d == date(2026, 12, 22)

    # 2. 5 November -> Next Due 5 December, Period: 5 Nov to 4 Dec
    s, e, d = calculate_billing_period(date(2026, 11, 5))
    assert s == date(2026, 11, 5)
    assert e == date(2026, 12, 4)
    assert d == date(2026, 12, 5)

    # 3. 1 November -> Next Due 1 December, Period: 1 Nov to 30 Nov
    s, e, d = calculate_billing_period(date(2026, 11, 1))
    assert s == date(2026, 11, 1)
    assert e == date(2026, 11, 30)
    assert d == date(2026, 12, 1)

    # 4. 31 January (non-leap year 2026) -> Clamped to 28 Feb, Period: 31 Jan to 27 Feb
    s, e, d = calculate_billing_period(date(2026, 1, 31))
    assert s == date(2026, 1, 31)
    assert e == date(2026, 2, 27)
    assert d == date(2026, 2, 28)

    # 5. 31 January (leap year 2028) -> Clamped to 29 Feb, Period: 31 Jan to 28 Feb
    s, e, d = calculate_billing_period(date(2028, 1, 31))
    assert s == date(2028, 1, 31)
    assert e == date(2028, 2, 28)
    assert d == date(2028, 2, 29)

    # 6. 30 January (non-leap year 2026) -> Clamped to 28 Feb
    s, e, d = calculate_billing_period(date(2026, 1, 30))
    assert s == date(2026, 1, 30)
    assert e == date(2026, 2, 27)
    assert d == date(2026, 2, 28)

    # 7. 31 March 2026 -> Clamped to 30 April, Period: 31 Mar to 29 Apr
    s, e, d = calculate_billing_period(date(2026, 3, 31))
    assert s == date(2026, 3, 31)
    assert e == date(2026, 4, 29)
    assert d == date(2026, 4, 30)


def test_room_creation_requires_valid_rent(admin_headers):
    """Room creation must fail if rent <= 0 or missing."""
    # 0 rent rejection
    res = client.post(
        f"{settings.API_V1_STR}/rooms",
        json={
            "room_number": "ROOM-ZERO-RENT",
            "floor": 1,
            "capacity": 2,
            "price": 0,
        },
        headers=admin_headers,
    )
    assert res.status_code == 422 or res.status_code == 400

    # Negative rent rejection
    res_neg = client.post(
        f"{settings.API_V1_STR}/rooms",
        json={
            "room_number": "ROOM-NEG-RENT",
            "floor": 1,
            "capacity": 2,
            "price": -100,
        },
        headers=admin_headers,
    )
    assert res_neg.status_code == 422 or res_neg.status_code == 400


def test_dynamic_room_rent_and_admission_cycle(admin_headers, staff_headers):
    """
    Complete end-to-end flow:
    1. Create Room 101 with rent ₹6,500
    2. Create Room 102 with rent ₹7,500
    3. Assign Guest A to Room 101 -> rent ₹6,500
    4. Assign Guest B to Room 102 -> rent ₹7,500
    5. Update Room 101 rent to ₹7,000 -> Guest A still has ₹6,500
    6. Assign Guest C to Room 101 -> new rent ₹7,000
    7. Generate receipt for Guest A -> dynamic billing period reflects check-in cycle
    """
    from app.database.session import SessionLocal
    from app.models.room import Room, Bed
    from app.models.admission import Admission
    from app.models.guest import Guest
    from app.models.finance import FeeReceipt

    u = uuid.uuid4().hex[:6]
    rnum_101 = f"101-T-{u}"
    rnum_102 = f"102-T-{u}"
    room_101_id = None
    room_102_id = None

    try:
        # 1. Create Room 101 with rent ₹6,500
        res_101 = client.post(
            f"{settings.API_V1_STR}/rooms",
            json={
                "room_number": rnum_101,
                "floor": 1,
                "capacity": 2,
                "room_type": "Standard Double Sharing",
                "price": 6500.0,
                "status": "Available",
            },
            headers=admin_headers,
        )
        assert res_101.status_code == 201
        room_101 = res_101.json()
        room_101_id = room_101["id"]
        assert room_101["price"] == 6500.0
        bed_101_a = room_101["beds"][0]

        # 2. Create Room 102 with rent ₹7,500
        res_102 = client.post(
            f"{settings.API_V1_STR}/rooms",
            json={
                "room_number": rnum_102,
                "floor": 1,
                "capacity": 2,
                "room_type": "Deluxe Double Sharing",
                "price": 7500.0,
                "status": "Available",
            },
            headers=admin_headers,
        )
        assert res_102.status_code == 201
        room_102 = res_102.json()
        room_102_id = room_102["id"]
        assert room_102["price"] == 7500.0
        bed_102_a = room_102["beds"][0]

        # 3. Admit Guest A into Room 101 with check-in on 22 Nov
        adm_a_res = client.post(
            f"{settings.API_V1_STR}/admissions",
            json={
                "guest_name": "Guest A Ananya",
                "contact_no": "+91 9898010001",
                "room_id": room_101["id"],
                "bed_id": bed_101_a["id"],
                "admission_date": "2026-11-22",
                "security_deposit": 5000.0,
                "monthly_fee": room_101["price"], # 6500.0 from room
            },
            headers=staff_headers,
        )
        assert adm_a_res.status_code == 201
        adm_a = adm_a_res.json()
        assert adm_a["monthly_fee"] == 6500.0
        assert adm_a["period_start"] == "2026-11-22"
        assert adm_a["period_end"] == "2026-12-21"
        assert adm_a["next_due_date"] == "2026-12-22"

        # 4. Admit Guest B into Room 102 with check-in on 5 Nov
        adm_b_res = client.post(
            f"{settings.API_V1_STR}/admissions",
            json={
                "guest_name": "Guest B Bhavana",
                "contact_no": "+91 9898010002",
                "room_id": room_102["id"],
                "bed_id": bed_102_a["id"],
                "admission_date": "2026-11-05",
                "security_deposit": 5000.0,
                "monthly_fee": room_102["price"], # 7500.0 from room
            },
            headers=staff_headers,
        )
        assert adm_b_res.status_code == 201
        adm_b = adm_b_res.json()
        assert adm_b["monthly_fee"] == 7500.0
        assert adm_b["period_start"] == "2026-11-05"
        assert adm_b["period_end"] == "2026-12-04"
        assert adm_b["next_due_date"] == "2026-12-05"

        # 5. Update Room 101 rent from ₹6,500 to ₹7,000
        patch_res = client.put(
            f"{settings.API_V1_STR}/rooms/{room_101['id']}",
            json={"price": 7000.0},
            headers=admin_headers,
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["price"] == 7000.0

        # Verify Guest A's agreed rent is UNCHANGED (still ₹6,500)
        adms = client.get(f"{settings.API_V1_STR}/admissions?guest_id={adm_a['guest_id']}", headers=staff_headers).json()
        assert adms[0]["monthly_fee"] == 6500.0

        # 6. Admit Guest C into Room 101 second bed -> receives updated rent ₹7,000
        bed_101_b = room_101["beds"][1]
        adm_c_res = client.post(
            f"{settings.API_V1_STR}/admissions",
            json={
                "guest_name": "Guest C Chitra",
                "contact_no": "+91 9898010003",
                "room_id": room_101["id"],
                "bed_id": bed_101_b["id"],
                "admission_date": "2026-11-25",
                "security_deposit": 5000.0,
                "monthly_fee": 7000.0, # Updated room rent
            },
            headers=staff_headers,
        )
        assert adm_c_res.status_code == 201
        adm_c = adm_c_res.json()
        assert adm_c["monthly_fee"] == 7000.0

        # 7. Generate Fee Receipt for Guest A (check-in 22 Nov)
        rec_res = client.post(
            f"{settings.API_V1_STR}/fee-receipts",
            json={
                "guest_id": adm_a["guest_id"],
                "date": "2026-11-22",
                "fee_type": "Hostel Accommodation Fee",
                "amount": adm_a["monthly_fee"],
                "discount": 0.0,
                "paid_amount": adm_a["monthly_fee"],
                "balance_amount": 0.0,
                "payment_mode": "UPI",
                "payment_reference": "UPI-REF-101",
            },
            headers=staff_headers,
        )
        assert rec_res.status_code == 201
        receipt = rec_res.json()
        assert receipt["amount"] == 6500.0
        # Billing period automatically generated from guest's check-in date
        assert receipt["period_start"] == "2026-11-22"
        assert receipt["period_end"] == "2026-12-21"

        # Test updating receipt details via PUT endpoint
        update_res = client.put(
            f"{settings.API_V1_STR}/fee-receipts/{receipt['id']}",
            json={
                "fee_type": "July Month Rent",
                "paid_amount": 5500.0,
                "payment_mode": "Cash",
            },
            headers=staff_headers,
        )
        assert update_res.status_code == 200
        updated_rec = update_res.json()
        assert updated_rec["fee_type"] == "July Month Rent"
        assert updated_rec["paid_amount"] == 5500.0
        assert updated_rec["payment_mode"] == "Cash"
    finally:
        # Teardown: Clean up test rooms and associated records
        db = SessionLocal()
        try:
            for rid in [room_101_id, room_102_id]:
                if not rid:
                    continue
                beds = db.query(Bed).filter(Bed.room_id == rid).all()
                bed_ids = [b.id for b in beds]
                admissions = db.query(Admission).filter(Admission.bed_id.in_(bed_ids)).all() if bed_ids else []
                guest_ids = [a.guest_id for a in admissions]
                for a in admissions:
                    db.delete(a)
                for gid in guest_ids:
                    db.query(FeeReceipt).filter(FeeReceipt.guest_id == gid).delete()
                    db.query(Guest).filter(Guest.id == gid).delete()
                for b in beds:
                    db.delete(b)
                r = db.query(Room).filter(Room.id == rid).first()
                if r:
                    db.delete(r)
            db.commit()
        finally:
            db.close()
