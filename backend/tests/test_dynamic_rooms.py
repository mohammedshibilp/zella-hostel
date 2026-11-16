import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

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


def test_staff_cannot_create_room(staff_headers):
    payload = {
        "room_number": "TEST-STAFF-999",
        "floor": 9,
        "capacity": 2,
        "room_type": "Single",
        "price": 5000,
        "status": "Available",
    }
    res = client.post(f"{settings.API_V1_STR}/rooms", json=payload, headers=staff_headers)
    assert res.status_code == 403


def test_admin_create_room_auto_generates_beds(admin_headers):
    # Test Room 901 with 4 beds
    payload = {
        "room_number": "901",
        "floor": 9,
        "capacity": 4,
        "room_type": "Dormitory",
        "price": 4500.0,
        "status": "Available",
        "notes": "Testing auto bed generation",
    }
    # Clean up if existed
    existing = client.get(f"{settings.API_V1_STR}/rooms?search=901", headers=admin_headers).json()
    for r in existing:
        if r["room_number"] == "901":
            client.delete(f"{settings.API_V1_STR}/rooms/{r['id']}", headers=admin_headers)

    res = client.post(f"{settings.API_V1_STR}/rooms", json=payload, headers=admin_headers)
    assert res.status_code == 201
    room = res.json()
    assert room["room_number"] == "901"
    assert room["capacity"] == 4
    assert len(room["beds"]) == 4
    bed_numbers = [b["bed_number"] for b in room["beds"]]
    assert "901-Bed 1" in bed_numbers
    assert "901-Bed 2" in bed_numbers
    assert "901-Bed 3" in bed_numbers
    assert "901-Bed 4" in bed_numbers

    # Verify duplicate room number is rejected
    res_dup = client.post(f"{settings.API_V1_STR}/rooms", json=payload, headers=admin_headers)
    assert res_dup.status_code == 400


def test_admin_update_room_capacity_and_delete(admin_headers):
    # Find Room 901
    rooms = client.get(f"{settings.API_V1_STR}/rooms?search=901", headers=admin_headers).json()
    target_room = next((r for r in rooms if r["room_number"] == "901"), None)
    assert target_room is not None

    # Update capacity to 5
    update_payload = {"capacity": 5, "price": 5000.0}
    res_up = client.put(f"{settings.API_V1_STR}/rooms/{target_room['id']}", json=update_payload, headers=admin_headers)
    assert res_up.status_code == 200
    updated_room = res_up.json()
    assert updated_room["capacity"] == 5
    assert len(updated_room["beds"]) == 5

    # Safe delete of vacant room
    res_del = client.delete(f"{settings.API_V1_STR}/rooms/{target_room['id']}", headers=admin_headers)
    assert res_del.status_code == 200

    # Confirm room is gone
    res_get = client.get(f"{settings.API_V1_STR}/rooms/{target_room['id']}", headers=admin_headers)
    assert res_get.status_code == 404
