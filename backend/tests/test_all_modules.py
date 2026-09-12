from datetime import date
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


@pytest.fixture(scope="session")
def admin_headers():
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def staff_headers():
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.STAFF_EMAIL, "password": settings.STAFF_PASSWORD},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# 1. AUTH & ROLES
def test_auth_and_roles(admin_headers, staff_headers):
    # Admin can list users
    res = client.get(f"{settings.API_V1_STR}/auth/users", headers=admin_headers)
    assert res.status_code == 200

    # Staff cannot access admin user list (RBAC)
    res_staff = client.get(f"{settings.API_V1_STR}/auth/users", headers=staff_headers)
    assert res_staff.status_code == 403

    # Unauthenticated access rejected
    res_unauth = client.get(f"{settings.API_V1_STR}/auth/me")
    assert res_unauth.status_code == 401


# 2. 23 ROOMS & BED MATRIX
def test_rooms_and_beds(staff_headers):
    res = client.get(f"{settings.API_V1_STR}/rooms", headers=staff_headers)
    assert res.status_code == 200
    rooms = res.json()
    assert len(rooms) == 23

    # Verify room chart endpoint
    res_chart = client.get(f"{settings.API_V1_STR}/rooms/chart", headers=staff_headers)
    assert res_chart.status_code == 200
    chart = res_chart.json()
    assert chart["total_rooms"] == 23
    assert chart["total_beds"] == 49
    assert "Floor 1" in chart["floor_summaries"]
    assert "Floor 2" in chart["floor_summaries"]
    assert "Floor 3" in chart["floor_summaries"]


# 3. ENQUIRY WORKFLOW (Matching Client Specs)
def test_enquiry_lifecycle(staff_headers):
    payload = {
        "date": str(date.today()),
        "name": "Arjun Singhania",
        "mode": "Walk-in",
        "occupation": "Working",
        "approx_coming_date": str(date.today()),
        "contact_no": "+91 9988776655",
        "current_status": "Open",
        "notes": "Looking for Double Sharing AC room",
    }
    # Create
    create_res = client.post(f"{settings.API_V1_STR}/enquiries", json=payload, headers=staff_headers)
    assert create_res.status_code == 201
    enquiry = create_res.json()
    assert enquiry["name"] == "Arjun Singhania"
    enquiry_id = enquiry["id"]

    # Search / Filter
    list_res = client.get(f"{settings.API_V1_STR}/enquiries?search=Arjun", headers=staff_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # Update status
    patch_res = client.patch(
        f"{settings.API_V1_STR}/enquiries/{enquiry_id}/status?current_status=Converted",
        headers=staff_headers
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["current_status"] == "Converted"


# 4. ADMISSION, BED OCCUPANCY, & COLLISION REJECTION
def test_admission_and_bed_collision(staff_headers):
    # Get available room and bed
    rooms_res = client.get(f"{settings.API_V1_STR}/rooms", headers=staff_headers)
    rooms = rooms_res.json()
    first_room = rooms[0]
    vacant_bed = [b for b in first_room["beds"] if not b["is_occupied"]][0]

    admission_payload = {
        "guest_name": "Deepak Chopra",
        "contact_no": "+91 9811223344",
        "email": "deepak@example.com",
        "occupation": "Studying",
        "guardian_name": "Kailash Chopra",
        "guardian_phone": "+91 9811223300",
        "address": "12 Civil Lines, Jaipur",
        "id_proof_type": "Aadhar Card",
        "id_proof_number": "1234-5678-9012",
        "room_id": first_room["id"],
        "bed_id": vacant_bed["id"],
        "admission_date": str(date.today()),
        "security_deposit": 5000.0,
        "monthly_fee": 6500.0,
    }

    # 1. Successful Admission
    adm_res = client.post(f"{settings.API_V1_STR}/admissions", json=admission_payload, headers=staff_headers)
    assert adm_res.status_code == 201
    adm_data = adm_res.json()
    adm_id = adm_data["id"]
    guest_id = adm_data["guest_id"]

    # 2. Collision Rejection: attempt to allocate same bed should return HTTP 400!
    duplicate_payload = {
        **admission_payload,
        "guest_name": "Another Candidate",
        "contact_no": "+91 9000011111",
    }
    collision_res = client.post(f"{settings.API_V1_STR}/admissions", json=duplicate_payload, headers=staff_headers)
    assert collision_res.status_code == 400
    assert "already occupied" in collision_res.json()["detail"].lower()

    # 3. Checkout: Releases bed
    checkout_res = client.post(
        f"{settings.API_V1_STR}/admissions/{adm_id}/checkout",
        json={"checkout_date": str(date.today()), "notes": "Completed internship"},
        headers=staff_headers
    )
    assert checkout_res.status_code == 200
    assert checkout_res.json()["status"] == "CheckedOut"

    # Verify bed is now available again
    room_check = client.get(f"{settings.API_V1_STR}/rooms/{first_room['id']}", headers=staff_headers)
    released_bed = [b for b in room_check.json()["beds"] if b["id"] == vacant_bed["id"]][0]
    assert released_bed["is_occupied"] is False


# 5. BOOKING LIFECYCLE
def test_booking_workflow(staff_headers):
    rooms_res = client.get(f"{settings.API_V1_STR}/rooms", headers=staff_headers)
    target_room = rooms_res.json()[1]
    target_bed = [b for b in target_room["beds"] if not b["is_occupied"]][0]

    booking_payload = {
        "guest_name": "Sneha Roy",
        "contact_no": "+91 9777665544",
        "email": "sneha@example.com",
        "room_id": target_room["id"],
        "bed_id": target_bed["id"],
        "booking_date": str(date.today()),
        "check_in_date": str(date.today()),
        "advance_amount": 2000.0,
    }

    # Create Booking
    bkg_res = client.post(f"{settings.API_V1_STR}/bookings", json=booking_payload, headers=staff_headers)
    assert bkg_res.status_code == 201
    booking = bkg_res.json()
    bkg_id = booking["id"]

    # Check In Booking
    checkin_res = client.post(f"{settings.API_V1_STR}/bookings/{bkg_id}/check-in", headers=staff_headers)
    assert checkin_res.status_code == 200
    assert checkin_res.json()["status"] == "CheckedIn"


# 6. ATTENDANCE (Single & Bulk)
def test_attendance_operations(staff_headers):
    guests_res = client.get(f"{settings.API_V1_STR}/guests", headers=staff_headers)
    guests = guests_res.json()
    if not guests:
        return

    g_id = guests[0]["id"]
    bulk_payload = {
        "date": str(date.today()),
        "records": [
            {"guest_id": g_id, "status": "Present", "remarks": "On time"}
        ]
    }
    res = client.post(f"{settings.API_V1_STR}/attendance/bulk", json=bulk_payload, headers=staff_headers)
    assert res.status_code == 200

    sum_res = client.get(
        f"{settings.API_V1_STR}/attendance/summary?attendance_date={str(date.today())}",
        headers=staff_headers
    )
    assert sum_res.status_code == 200
    assert sum_res.json()["present_count"] >= 1


# 7. FEE RECEIPTS & INVOICING
def test_fee_receipts(staff_headers):
    guests_res = client.get(f"{settings.API_V1_STR}/guests", headers=staff_headers)
    guests = guests_res.json()
    if not guests:
        return

    receipt_payload = {
        "guest_id": guests[0]["id"],
        "date": str(date.today()),
        "amount": 6500.0,
        "payment_mode": "UPI",
        "remarks": "Monthly fee payment",
    }
    rec_res = client.post(f"{settings.API_V1_STR}/fee-receipts", json=receipt_payload, headers=staff_headers)
    assert rec_res.status_code == 201
    receipt = rec_res.json()
    assert receipt["receipt_no"].startswith("REC-")
    assert receipt["amount"] == 6500.0


# 8. ACCOUNTS & DOUBLE-ENTRY LEDGER
def test_accounts_ledger(staff_headers):
    # Record Credit (Income)
    cr_payload = {
        "date": str(date.today()),
        "transaction_type": "Plain",
        "particulars": "Sponsorship Inflow",
        "amount": 15000.0,
        "payment_channel": "Bank",
        "entry_type": "Cr",
        "reference_no": "TX-CR-001",
    }
    res_cr = client.post(f"{settings.API_V1_STR}/accounts", json=cr_payload, headers=staff_headers)
    assert res_cr.status_code == 201

    # Record Debit (Expense)
    dr_payload = {
        "date": str(date.today()),
        "transaction_type": "Plain",
        "particulars": "Hostel WiFi Bill",
        "amount": 2500.0,
        "payment_channel": "Bank",
        "entry_type": "Dr",
        "reference_no": "TX-DR-001",
    }
    res_dr = client.post(f"{settings.API_V1_STR}/accounts", json=dr_payload, headers=staff_headers)
    assert res_dr.status_code == 201

    # Check Summary
    sum_res = client.get(f"{settings.API_V1_STR}/accounts/summary", headers=staff_headers)
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert summary["total_credit"] >= 15000.0
    assert summary["total_debit"] >= 2500.0
    assert summary["net_balance"] == summary["total_credit"] - summary["total_debit"]


# 9. DYNAMIC DASHBOARD METRICS
def test_dashboard_real_data(staff_headers):
    res = client.get(f"{settings.API_V1_STR}/dashboard/metrics", headers=staff_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_rooms"] == 23
    assert data["total_beds"] == 49
    assert data["total_income_this_month"] > 0
