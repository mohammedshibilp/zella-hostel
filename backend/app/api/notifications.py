from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.notification import PushSubscription
from app.schemas.notification import (
    PushSubscriptionCreate,
    PushSubscriptionResponse,
    NotificationStatusResponse,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/notifications", tags=["Push Notifications"])


@router.get("/status", response_model=NotificationStatusResponse)
def get_notification_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get current user's push notification subscription status and backend readiness.
    """
    user_subscriptions = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == current_user.id)
        .all()
    )

    return NotificationStatusResponse(
        supported=True,
        configured=True,
        is_subscribed=len(user_subscriptions) > 0,
        active_subscriptions_count=len(user_subscriptions),
    )


@router.post("/subscribe", response_model=PushSubscriptionResponse)
def subscribe_push(
    payload: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Register a browser PushManager subscription for the authenticated user.
    Never stores or requires client-side VAPID private keys.
    """
    # Check if subscription endpoint already registered
    existing = (
        db.query(PushSubscription)
        .filter(PushSubscription.endpoint == payload.endpoint)
        .first()
    )

    if existing:
        existing.user_id = current_user.id
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        if payload.user_agent:
            existing.user_agent = payload.user_agent
        db.commit()
        db.refresh(existing)
        return existing

    sub = PushSubscription(
        user_id=current_user.id,
        endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth,
        user_agent=payload.user_agent,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.post("/unsubscribe")
def unsubscribe_push(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Remove push notification subscription for the authenticated user.
    """
    endpoint = payload.get("endpoint")
    if endpoint:
        db.query(PushSubscription).filter(
            PushSubscription.user_id == current_user.id,
            PushSubscription.endpoint == endpoint,
        ).delete()
    else:
        # If no endpoint provided, remove all active subscriptions for user
        db.query(PushSubscription).filter(
            PushSubscription.user_id == current_user.id
        ).delete()

    db.commit()
    return {"message": "Push notifications unsubscribed successfully."}
