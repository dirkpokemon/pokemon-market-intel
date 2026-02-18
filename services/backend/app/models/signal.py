"""
Signal Model (Reference from Analysis Service)
Read-only access to market signals
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Boolean, Text

from app.database import Base


class Signal(Base):
    """
    Market signals and alerts (read-only)
    """
    
    __tablename__ = "signals"
    
    id = Column(Integer, primary_key=True)
    signal_type = Column(String(50))
    signal_level = Column(String(20))
    
    product_name = Column(String(500))
    product_set = Column(String(255))
    category = Column(String(50))
    
    current_price = Column(Numeric(10, 2))
    market_avg_price = Column(Numeric(10, 2))
    deal_score = Column(Numeric(5, 2))
    
    description = Column(Text)
    signal_metadata = Column(Text)
    
    confidence = Column(Numeric(5, 2))
    priority = Column(Integer)
    
    is_active = Column(Boolean)
    is_sent = Column(Boolean)
    
    detected_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))
