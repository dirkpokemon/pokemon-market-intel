"""
User Model
Handles user accounts and authentication
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    """User subscription tiers"""
    free = "free"
    paid = "paid"
    pro = "pro"
    admin = "admin"
    
    FREE = "free"
    PAID = "paid"
    PRO = "pro"
    ADMIN = "admin"


class User(Base):
    """
    User account model
    """
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Authentication
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # Profile
    full_name = Column(String(255))
    
    # Subscription
    role = Column(String(50), default="free", nullable=False, index=True)
    stripe_customer_id = Column(String(255), unique=True, index=True)
    stripe_subscription_id = Column(String(255), unique=True)
    subscription_status = Column(String(50))  # active, canceled, past_due, etc.
    subscription_end_date = Column(DateTime(timezone=True))
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Email verification
    verification_token = Column(String(255), index=True)
    verification_token_expires = Column(DateTime(timezone=True))
    
    # Alert preferences
    alerts_enabled = Column(Boolean, default=True)
    alert_email = Column(String(255))
    telegram_chat_id = Column(String(255))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True))
    
    def __repr__(self):
        return f"<User(email='{self.email}', role='{self.role}')>"
    
    def is_premium(self) -> bool:
        """Check if user has premium access (paid or pro)"""
        return self.role in ["paid", "pro", "admin"]
    
    def is_pro(self) -> bool:
        """Check if user has pro access"""
        return self.role in ["pro", "admin"]
