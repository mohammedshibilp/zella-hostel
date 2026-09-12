from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_name: str
    email: str


class TokenData(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "STAFF"
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str
