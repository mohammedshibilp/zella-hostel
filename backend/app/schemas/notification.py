from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: PushKeys
    user_agent: Optional[str] = None


class PushSubscriptionResponse(BaseModel):
    id: int
    user_id: int
    endpoint: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationStatusResponse(BaseModel):
    supported: bool
    configured: bool
    is_subscribed: bool
    active_subscriptions_count: int
