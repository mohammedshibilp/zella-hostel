import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_admin_login_success():
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"
    assert data["email"] == settings.ADMIN_EMAIL


def test_staff_login_success():
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.STAFF_EMAIL, "password": settings.STAFF_PASSWORD}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "STAFF"
    assert data["email"] == settings.STAFF_EMAIL


def test_invalid_login_rejection():
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "wrong@zellahostel.com", "password": "WrongPassword!"}
    )
    assert response.status_code == 401


def test_get_me_with_token():
    login_resp = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_resp = client.get(f"{settings.API_V1_STR}/auth/me", headers=headers)
    assert me_resp.status_code == 200
    user_data = me_resp.json()
    assert user_data["email"] == settings.ADMIN_EMAIL
    assert user_data["role"] == "ADMIN"


def test_verify_23_rooms():
    login_resp = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    rooms_resp = client.get(f"{settings.API_V1_STR}/rooms", headers=headers)
    assert rooms_resp.status_code == 200
    rooms = rooms_resp.json()
    assert len(rooms) == 23, f"Expected 23 rooms, got {len(rooms)}"

    room_numbers = {r["room_number"] for r in rooms}
    expected_rooms = (
        {str(r) for r in range(101, 111)} |
        {str(r) for r in range(201, 211)} |
        {str(r) for r in range(301, 304)}
    )
    assert room_numbers == expected_rooms, f"Room numbers mismatch: {expected_rooms - room_numbers}"


def test_dashboard_metrics():
    login_resp = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.STAFF_EMAIL, "password": settings.STAFF_PASSWORD}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    dash_resp = client.get(f"{settings.API_V1_STR}/dashboard/metrics", headers=headers)
    assert dash_resp.status_code == 200
    data = dash_resp.json()
    assert data["total_rooms"] == 23
    assert data["total_beds"] == 49
    assert data["vacancies"] >= 0
    assert len(data["floor_stats"]) == 3
