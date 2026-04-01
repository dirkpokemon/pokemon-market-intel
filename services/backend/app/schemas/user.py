"""
User Pydantic schemas for request/response validation
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for user registration"""
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class UserResponse(UserBase):
    """Schema for user response (public info)"""
    id: int
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    subscription_status: Optional[str] = None
    subscription_end_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for JWT token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class SubscriptionResponse(BaseModel):
    """Schema for subscription status response"""
    role: str
    subscription_status: Optional[str] = None
    subscription_end_date: Optional[datetime] = None
    is_premium: bool
    is_pro: bool
    stripe_customer_id: Optional[str] = None


class NotificationPrefsUpdate(BaseModel):
    """Schema for updating notification preferences"""
    alerts_enabled: Optional[bool] = None
    alert_email: Optional[str] = None
    telegram_chat_id: Optional[str] = None


class NotificationPrefsResponse(BaseModel):
    """Schema for notification preferences response"""
    alerts_enabled: bool
    alert_email: Optional[str] = None
    telegram_chat_id: Optional[str] = None

    class Config:
        from_attributes = True
