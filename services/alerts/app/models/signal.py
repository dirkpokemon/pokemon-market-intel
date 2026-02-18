"""
Signal Model (read-only for alert engine)
Imported from existing signals table - DO NOT MODIFY SCHEMA
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Numeric, Text
from sqlalchemy.sql import func

from app.database import Base


class Signal(Base):
    """
    Market signal model (READ-ONLY for alert engine)
    This mirrors the existing signals table
    """
    
    __tablename__ = "signals"
    
    id = Column(Integer, primary_key=True, index=True)
    signal_type = Column(String(50), nullable=False, index=True)
    signal_level = Column(String(20), nullable=False, index=True)  # high, medium, low
    product_name = Column(String(500), nullable=False, index=True)
    product_set = Column(String(255))
    category = Column(String(50))
    current_price = Column(Numeric(10, 2))
    market_avg_price = Column(Numeric(10, 2))
    deal_score = Column(Numeric(5, 2))
    description = Column(Text)
    signal_metadata = Column(Text)
    confidence = Column(Numeric(5, 2))
    priority = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, index=True)
    is_sent = Column(Boolean, default=False)  # Tracked by alert engine
    sent_at = Column(DateTime(timezone=True))
    detected_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<Signal(product='{self.product_name}', level='{self.signal_level}', score={self.deal_score})>"
