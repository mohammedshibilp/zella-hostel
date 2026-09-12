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


# 7. FEE RECEIPTS & INVOICING (Client Fields & Calculations)
def test_fee_receipts(staff_headers):
    guests_res = client.get(f"{settings.API_V1_STR}/guests", headers=staff_headers)
    guests = guests_res.json()
    if not guests:
        return

    receipt_payload = {
        "guest_id": guests[0]["id"],
        "date": str(date.today()),
        "fee_type": "Hostel Accommodation Fee",
        "amount": 7000.0,
        "discount": 500.0,
        "paid_amount": 6500.0,
        "balance_amount": 0.0,
        "payment_mode": "Card",
        "payment_reference": "CARD-AUTH-987654",
        "period_start": str(date.today()),
        "period_end": str(date.today()),
        "remarks": "Monthly fee payment via Card",
    }
    rec_res = client.post(f"{settings.API_V1_STR}/fee-receipts", json=receipt_payload, headers=staff_headers)
    assert rec_res.status_code == 201
    receipt = rec_res.json()
    assert receipt["receipt_no"].startswith("REC-")
    assert receipt["amount"] == 7000.0
    assert receipt["discount"] == 500.0
    assert receipt["paid_amount"] == 6500.0
    assert receipt["payment_mode"] == "Card"
    assert receipt["payment_reference"] == "CARD-AUTH-987654"


# 8. ACCOUNTS 4 SPECIFIC CLIENT PERMUTATIONS
def test_accounts_four_permutations(staff_headers):
    guests_res = client.get(f"{settings.API_V1_STR}/guests", headers=staff_headers)
    guest_id = guests_res.json()[0]["id"] if guests_res.json() else None

    # 1. Guest + Cash + Debit
    tx1 = client.post(f"{settings.API_V1_STR}/accounts", json={
        "date": str(date.today()),
        "transaction_type": "Guest",
        "guest_id": guest_id,
        "particulars": "Guest Security Refund",
        "amount": 1000.0,
        "payment_channel": "Cash",
        "entry_type": "Dr"
    }, headers=staff_headers)
    assert tx1.status_code == 201

    # 2. Guest + Bank + Credit
    tx2 = client.post(f"{settings.API_V1_STR}/accounts", json={
        "date": str(date.today()),
        "transaction_type": "Guest",
        "guest_id": guest_id,
        "particulars": "Guest Fee via NEFT",
        "amount": 6500.0,
        "payment_channel": "Bank",
        "entry_type": "Cr"
    }, headers=staff_headers)
    assert tx2.status_code == 201

    # 3. Plain + Cash + Debit
    tx3 = client.post(f"{settings.API_V1_STR}/accounts", json={
        "date": str(date.today()),
        "transaction_type": "Plain",
        "particulars": "Office Stationery & Cleaning Supplies",
        "amount": 450.0,
        "payment_channel": "Cash",
        "entry_type": "Dr"
    }, headers=staff_headers)
    assert tx3.status_code == 201

    # 4. Plain + Bank + Credit
    tx4 = client.post(f"{settings.API_V1_STR}/accounts", json={
        "date": str(date.today()),
        "transaction_type": "Plain",
        "particulars": "Vendor Scrap Sale Inflow",
        "amount": 2500.0,
        "payment_channel": "Bank",
        "entry_type": "Cr"
    }, headers=staff_headers)
    assert tx4.status_code == 201

    # Verify summary calculations
    sum_res = client.get(f"{settings.API_V1_STR}/accounts/summary", headers=staff_headers)
    assert sum_res.status_code == 200
    s = sum_res.json()
    assert s["total_credit"] > 0
    assert s["total_debit"] > 0
    assert s["net_balance"] == round(s["total_credit"] - s["total_debit"], 2)


# 9. ATTENDANCE INCLUDING 'OUT' STATUS & SUMMARY
def test_attendance_with_out_status(staff_headers):
    guests_res = client.get(f"{settings.API_V1_STR}/guests", headers=staff_headers)
    guests = guests_res.json()
    if len(guests) >= 1:
        g_id = guests[0]["id"]
        # Save Out status
        bulk_payload = {
            "date": str(date.today()),
            "records": [{"guest_id": g_id, "status": "Out", "remarks": "Late library permission"}]
        }
        res = client.post(f"{settings.API_V1_STR}/attendance/bulk", json=bulk_payload, headers=staff_headers)
        assert res.status_code == 200

        sum_res = client.get(
            f"{settings.API_V1_STR}/attendance/summary?attendance_date={str(date.today())}",
            headers=staff_headers
        )
        assert sum_res.status_code == 200
        assert sum_res.json()["out_count"] >= 1


# 10. VERIFY EXACT 23 INITIAL ROOMS & 49 BEDS
def test_exact_23_initial_rooms(staff_headers):
    res = client.get(f"{settings.API_V1_STR}/rooms", headers=staff_headers)
    assert res.status_code == 200
    rooms = res.json()
    assert len(rooms) == 23

    expected_rooms = [
        "101", "102", "103", "104", "105", "106", "107", "108", "109", "110",
        "201", "202", "203", "204", "205", "206", "207", "208", "209", "210",
        "301", "302", "303"
    ]
    room_numbers = [r["room_number"] for r in rooms]
    assert sorted(room_numbers) == sorted(expected_rooms)

    total_beds = sum(len(r["beds"]) for r in rooms)
    assert total_beds == 49


# 11. OVERLAPPING BOOKING COLLISION REJECTION
def test_overlapping_booking_rejection(staff_headers):
    rooms_res = client.get(f"{settings.API_V1_STR}/rooms", headers=staff_headers)
    room = [r for r in rooms_res.json() if r["floor"] == 2][0]
    bed = [b for b in room["beds"] if not b["is_occupied"]][0]

    b1_payload = {
        "guest_name": "Applicant One",
        "contact_no": "+91 9111122222",
        "email": "applicant1@example.com",
        "room_id": room["id"],
        "bed_id": bed["id"],
        "booking_date": str(date.today()),
        "check_in_date": str(date.today()),
        "advance_amount": 1000.0,
    }
    b1_res = client.post(f"{settings.API_V1_STR}/bookings", json=b1_payload, headers=staff_headers)
    assert b1_res.status_code == 201

    # Overlapping attempt on same bed MUST fail with HTTP 400
    b2_payload = {
        "guest_name": "Applicant Two",
        "contact_no": "+91 9333344444",
        "email": "applicant2@example.com",
        "room_id": room["id"],
        "bed_id": bed["id"],
        "booking_date": str(date.today()),
        "check_in_date": str(date.today()),
        "advance_amount": 1000.0,
    }
    b2_res = client.post(f"{settings.API_V1_STR}/bookings", json=b2_payload, headers=staff_headers)
    assert b2_res.status_code == 400
    assert "already booked" in b2_res.json()["detail"].lower()


# 12. COMPLETE END-TO-END BUSINESS FLOW
def test_complete_business_flow(staff_headers):
    # Step 1: ENQUIRY
    enq_res = client.post(f"{settings.API_V1_STR}/enquiries", json={
        "date": str(date.today()),
        "name": "Kavita Sharma",
        "mode": "Call",
        "occupation": "Working",
        "approx_coming_date": str(date.today()),
        "contact_no": "+91 9876500112",
        "current_status": "Open",
        "notes": "Prefers ground floor room"
    }, headers=staff_headers)
    assert enq_res.status_code == 201
    enq = enq_res.json()

    # Step 2: CONVERT TO ADMISSION (Status Converted)
    patch_enq = client.patch(
        f"{settings.API_V1_STR}/enquiries/{enq['id']}/status?current_status=Converted",
        headers=staff_headers
    )
    assert patch_enq.status_code == 200

    # Step 3: GET ROOM & VACANT BED
    rooms_res = client.get(f"{settings.API_V1_STR}/rooms", headers=staff_headers)
    selected_room = [r for r in rooms_res.json() if r["vacant_count"] > 0][0]
    selected_bed = [b for b in selected_room["beds"] if not b["is_occupied"]][0]

    # Step 4: ADMISSION
    adm_res = client.post(f"{settings.API_V1_STR}/admissions", json={
        "guest_name": "Kavita Sharma",
        "contact_no": "+91 9876500112",
        "email": "kavita@example.com",
        "occupation": "Working",
        "guardian_name": "Mr. Sharma",
        "guardian_phone": "+91 9876500000",
        "address": "South Extension, New Delhi",
        "id_proof_type": "Passport",
        "id_proof_number": "Z1234567",
        "room_id": selected_room["id"],
        "bed_id": selected_bed["id"],
        "admission_date": str(date.today()),
        "security_deposit": 5000.0,
        "monthly_fee": 6500.0,
    }, headers=staff_headers)
    assert adm_res.status_code == 201
    adm = adm_res.json()
    guest_id = adm["guest_id"]
    adm_id = adm["id"]

    # Step 5: BED OCCUPIED & ROOM STATUS
    bed_check = client.get(f"{settings.API_V1_STR}/rooms/{selected_room['id']}", headers=staff_headers)
    bed_obj = [b for b in bed_check.json()["beds"] if b["id"] == selected_bed["id"]][0]
    assert bed_obj["is_occupied"] is True

    # Step 6: DASHBOARD METRICS
    dash_res = client.get(f"{settings.API_V1_STR}/dashboard/metrics", headers=staff_headers)
    assert dash_res.status_code == 200
    assert dash_res.json()["occupied_beds"] > 0

    # Step 7: FEE RECEIPT
    rec_res = client.post(f"{settings.API_V1_STR}/fee-receipts", json={
        "guest_id": guest_id,
        "admission_id": adm_id,
        "date": str(date.today()),
        "fee_type": "Hostel Accommodation Fee",
        "amount": 6500.0,
        "discount": 0.0,
        "paid_amount": 6500.0,
        "balance_amount": 0.0,
        "payment_mode": "UPI",
        "payment_reference": "UPI-FLOW-001",
        "remarks": "First month rent"
    }, headers=staff_headers)
    assert rec_res.status_code == 201
    receipt = rec_res.json()
    assert receipt["receipt_no"].startswith("REC-")

    # Step 8: ATTENDANCE
    att_res = client.post(f"{settings.API_V1_STR}/attendance/bulk", json={
        "date": str(date.today()),
        "records": [{"guest_id": guest_id, "status": "Present", "remarks": "First day"}]
    }, headers=staff_headers)
    assert att_res.status_code == 200

    # Step 9: CHECKOUT
    co_res = client.post(f"{settings.API_V1_STR}/admissions/{adm_id}/checkout", json={
        "checkout_date": str(date.today()),
        "notes": "End of stay"
    }, headers=staff_headers)
    assert co_res.status_code == 200
    assert co_res.json()["status"] == "CheckedOut"

    # Step 10: BED RELEASED
    room_after = client.get(f"{settings.API_V1_STR}/rooms/{selected_room['id']}", headers=staff_headers)
    bed_after = [b for b in room_after.json()["beds"] if b["id"] == selected_bed["id"]][0]
    assert bed_after["is_occupied"] is False

    # Step 11: GUEST NO LONGER ACTIVE RESIDENT
    guest_after = client.get(f"{settings.API_V1_STR}/guests/{guest_id}", headers=staff_headers)
    assert guest_after.json()["status"] == "Vacated"
