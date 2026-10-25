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
    card_number = Column(String(100))       # variant id within a set ('' for sealed)
    collector_number = Column(String(50))
    rarity = Column(String(100))
    
    avg_price_7d = Column(Numeric(10, 2))
    avg_price_30d = Column(Numeric(10, 2))
    volume_7d = Column(Integer)
    volume_30d = Column(Integer)
    
    price_trend_7d = Column(Numeric(5, 2))
    price_trend_30d = Column(Numeric(5, 2))
    volume_trend_7d = Column(Numeric(5, 2))
    
    liquidity_score = Column(Numeric(5, 2))
    volatility = Column(Numeric(5, 2))

    # Written by the analysis service (see services/analysis/app/models/market_stats.py)
    min_price_30d = Column(Numeric(10, 2))
    max_price_30d = Column(Numeric(10, 2))
    current_price = Column(Numeric(10, 2))      # cheapest comparable listing on the latest day
    floor_price_30d = Column(Numeric(10, 2))    # median of the daily cheapest listing
    days_observed = Column(Integer)
    sample_size = Column(Integer)
    data_quality = Column(String(20))
    last_seen_at = Column(DateTime(timezone=True))
    # Buy/wait signal (written by analysis): buy | wait | rising | falling | stable, NULL = too little history
    market_signal = Column(String(20))
    floor_change_7d = Column(Numeric(6, 2))
    supply_change_7d = Column(Numeric(6, 2))
    
    calculated_at = Column(DateTime(timezone=True))
