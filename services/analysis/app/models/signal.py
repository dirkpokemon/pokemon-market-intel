"""
Signal Model
Stores detected market signals and alerts
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Boolean, Text, Index
from sqlalchemy.sql import func

from app.database import Base


class Signal(Base):
    """
    Market signals and alerts
    """
    
    __tablename__ = "signals"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Signal classification
    signal_type = Column(String(50), nullable=False, index=True)
    # Types: high_deal, medium_deal, undervalued, momentum, arbitrage, risk
    
    signal_level = Column(String(20), nullable=False, index=True)
    # Levels: high, medium, low
    
    # Product identification
    product_name = Column(String(500), nullable=False, index=True)
    product_set = Column(String(255))
    category = Column(String(50))
    
    # Signal data
    current_price = Column(Numeric(10, 2))
    market_avg_price = Column(Numeric(10, 2))
    deal_score = Column(Numeric(5, 2))
    
    # Signal details
    description = Column(Text)
    signal_metadata = Column(Text)  # JSON string with additional data
    
    # Confidence and quality
    confidence = Column(Numeric(5, 2))  # 0-100
    priority = Column(Integer, default=0)  # Higher = more urgent
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    is_sent = Column(Boolean, default=False)  # For alert system
    sent_at = Column(DateTime(timezone=True))
    
    # Timestamps
    detected_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    __table_args__ = (
        Index('idx_signal_type_level', 'signal_type', 'signal_level'),
        Index('idx_signal_active', 'is_active', 'detected_at'),
        Index('idx_signal_priority', 'priority', 'is_active'),
    )
    
    def __repr__(self):
        return f"<Signal(type='{self.signal_type}', level='{self.signal_level}', product='{self.product_name}')>"
