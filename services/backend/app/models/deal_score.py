"""
Deal Score Model (Reference from Analysis Service)
Read-only access to deal scores
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Boolean

from app.database import Base


class DealScore(Base):
    """
    Deal score per product (read-only)
    """
    
    __tablename__ = "deal_scores"
    
    id = Column(Integer, primary_key=True)
    product_name = Column(String(500))
    product_set = Column(String(255))
    category = Column(String(50))
    card_number = Column(String(100))       # variant id within a set ('' for sealed)
    collector_number = Column(String(50))
    rarity = Column(String(100))
    language = Column(String(10))           # listing language (EN, JP); NULL = EN
    
    current_price = Column(Numeric(10, 2))
    currency = Column(String(3))
    condition = Column(String(50))
    
    market_avg_price = Column(Numeric(10, 2))
    market_min_price = Column(Numeric(10, 2))
    
    price_deviation_score = Column(Numeric(5, 2))
    volume_trend_score = Column(Numeric(5, 2))
    liquidity_score = Column(Numeric(5, 2))
    popularity_score = Column(Numeric(5, 2))
    
    deal_score = Column(Numeric(5, 2))
    confidence = Column(Numeric(5, 2))
    data_quality = Column(String(20))
    # Buy/wait signal (written by analysis): buy | wait | rising | falling | stable, NULL = too little history
    market_signal = Column(String(20))
    floor_change_7d = Column(Numeric(6, 2))
    supply_change_7d = Column(Numeric(6, 2))
    
    is_active = Column(Boolean)
    calculated_at = Column(DateTime(timezone=True))
