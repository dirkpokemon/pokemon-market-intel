"""
Market Statistics Model (Reference from Analysis Service)
Read-only access to market statistics
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, DateTime

from app.database import Base


class MarketStats(Base):
    """
    Market statistics per product (read-only)
    """
    
    __tablename__ = "market_statistics"
    
    id = Column(Integer, primary_key=True)
    product_name = Column(String(500))
    product_set = Column(String(255))
    category = Column(String(50))
    
    avg_price_7d = Column(Numeric(10, 2))
    avg_price_30d = Column(Numeric(10, 2))
    volume_7d = Column(Integer)
    volume_30d = Column(Integer)
    
    price_trend_7d = Column(Numeric(5, 2))
    price_trend_30d = Column(Numeric(5, 2))
    volume_trend_7d = Column(Numeric(5, 2))
    
    liquidity_score = Column(Numeric(5, 2))
    volatility = Column(Numeric(5, 2))
    
    calculated_at = Column(DateTime(timezone=True))
