"""
User Pydantic schemas for request/response validation
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


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
    role: UserRole
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
    role: UserRole
    subscription_status: Optional[str] = None
    subscription_end_date: Optional[datetime] = None
    is_premium: bool
    is_pro: bool
    stripe_customer_id: Optional[str] = None
