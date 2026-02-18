"""
User Model (read-only for alert engine)
Imported from existing users table - DO NOT MODIFY SCHEMA
"""

import enum
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum
from sqlalchemy.sql import func

from app.database import Base


class UserRole(str, enum.Enum):
    """User subscription tiers"""
    free = "free"
    paid = "paid"
    pro = "pro"
    admin = "admin"


class User(Base):
    """
    User account model (READ-ONLY for alert engine)
    This mirrors the existing users table
    """
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(Enum(UserRole), default=UserRole.free, nullable=False, index=True)
    stripe_customer_id = Column(String(255), unique=True, index=True)
    stripe_subscription_id = Column(String(255), unique=True)
    subscription_status = Column(String(50))
    subscription_end_date = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True))
    
    # Alert preferences (optional fields)
    telegram_chat_id = Column(String(255))  # For Telegram alerts
    alert_email = Column(String(255))  # Custom alert email (if different from login email)
    alerts_enabled = Column(Boolean, default=True)  # User can disable alerts
    
    def is_premium(self) -> bool:
        """Check if user has premium access (paid or pro)"""
        return self.role in [UserRole.paid, UserRole.pro, UserRole.admin]
    
    def __repr__(self):
        return f"<User(email='{self.email}', role='{self.role}')>"
