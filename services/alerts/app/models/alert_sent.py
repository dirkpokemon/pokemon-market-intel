"""
AlertSent Model
Tracks all alerts that have been sent to users to prevent duplicates
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Index, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class AlertSent(Base):
    """
    Record of sent alerts to prevent duplicates
    
    This table tracks every alert sent to every user through any channel
    """
    
    __tablename__ = "alerts_sent"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # User who received the alert
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Signal that triggered the alert
    signal_id = Column(Integer, ForeignKey("signals.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Alert details
    alert_type = Column(String(50), nullable=False, index=True)  # immediate, digest
    severity = Column(String(20), nullable=False)  # high, medium, low
    channel = Column(String(50), nullable=False)  # email, telegram
    
    # Message details
    subject = Column(String(500))
    message_preview = Column(String(1000))  # First 1000 chars of message
    
    # Delivery status
    sent_successfully = Column(Boolean, default=True, nullable=False)
    error_message = Column(String(1000))
    
    # External tracking
    external_message_id = Column(String(255))  # Provider's message ID
    
    # Timestamps
    sent_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Indexes for efficient queries
    __table_args__ = (
        Index('idx_alerts_sent_user_signal', user_id, signal_id),
        Index('idx_alerts_sent_user_date', user_id, sent_at),
        Index('idx_alerts_sent_type_channel', alert_type, channel),
    )
    
    def __repr__(self):
        return f"<AlertSent(user_id={self.user_id}, signal_id={self.signal_id}, channel='{self.channel}')>"
