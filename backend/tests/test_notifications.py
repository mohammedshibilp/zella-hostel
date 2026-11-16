from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


def test_notification_status_unauthorized():
    res = client.get(f"{settings.API_V1_STR}/notifications/status")
    assert res.status_code == 401


def test_notification_lifecycle_with_admin():
    # Login as admin
    login_res = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Check status
    status_res = client.get(f"{settings.API_V1_STR}/notifications/status", headers=headers)
    assert status_res.status_code == 200
    assert status_res.json()["supported"] is True
    assert status_res.json()["configured"] is True

    # Subscribe
    sub_payload = {
        "endpoint": "https://fcm.googleapis.com/fcm/send/test-sub-123",
        "keys": {
            "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0A43cxQ3iENbPoW0h50DQhP8kHwt7jJ7aP",
            "auth": "tBHItJI5svbpez7KI4CCXg",
        },
        "user_agent": "Mozilla/5.0 Test PWA Browser",
    }
    sub_res = client.post(f"{settings.API_V1_STR}/notifications/subscribe", json=sub_payload, headers=headers)
    assert sub_res.status_code == 200
    assert sub_res.json()["endpoint"] == sub_payload["endpoint"]

    # Verify status reflects active subscription
    status_after = client.get(f"{settings.API_V1_STR}/notifications/status", headers=headers)
    assert status_after.status_code == 200
    assert status_after.json()["is_subscribed"] is True
    assert status_after.json()["active_subscriptions_count"] >= 1

    # Unsubscribe
    unsub_res = client.post(
        f"{settings.API_V1_STR}/notifications/unsubscribe",
        json={"endpoint": sub_payload["endpoint"]},
        headers=headers,
    )
    assert unsub_res.status_code == 200

    # Verify status after unsubscribe
    status_final = client.get(f"{settings.API_V1_STR}/notifications/status", headers=headers)
    assert status_final.status_code == 200
    assert status_final.json()["is_subscribed"] is False
