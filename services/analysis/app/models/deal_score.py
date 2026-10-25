"""
Deal Score Model
Stores calculated deal scores for products
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Boolean, Index
from sqlalchemy.sql import func

from app.database import Base


class DealScore(Base):
    """
    Deal score per product listing
    Score ranges from 0-100 (higher = better deal)
    """
    
    __tablename__ = "deal_scores"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Product identification
    product_name = Column(String(500), nullable=False, index=True)
    product_set = Column(String(255), index=True)
    category = Column(String(50))
    # Variant identity within a set (CardTrader blueprint id; '' for sealed) and its labels
    card_number = Column(String(100))
    collector_number = Column(String(50))
    rarity = Column(String(100))
    
    # Current listing info
    current_price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default='EUR')
    condition = Column(String(50))
    source = Column(String(255))
    
    # Reference prices
    market_avg_price = Column(Numeric(10, 2))
    market_min_price = Column(Numeric(10, 2))
    
    # Deal score components (0-100 each)
    price_deviation_score = Column(Numeric(5, 2))  # How far below market avg
    volume_trend_score = Column(Numeric(5, 2))     # Listing volume trend
    liquidity_score = Column(Numeric(5, 2))        # Market liquidity
    popularity_score = Column(Numeric(5, 2))       # Set/product popularity
    
    # Final composite score (0-100)
    deal_score = Column(Numeric(5, 2), nullable=False, index=True)
    
    # Quality metrics
    confidence = Column(Numeric(5, 2))  # Confidence in score (0-100)
    data_quality = Column(String(20))

    # Buy/wait signal (scoring.market_signal): buy | wait | rising | falling | stable, NULL = too little history
    market_signal = Column(String(20))
    floor_change_7d = Column(Numeric(6, 2))    # % change of the usual cheapest listing, last 7 days vs before
    supply_change_7d = Column(Numeric(6, 2))   # % change of listings per day, last 7 days vs before
    
    # Metadata
    is_active = Column(Boolean, default=True, index=True)
    expires_at = Column(DateTime(timezone=True))
    
    calculated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    __table_args__ = (
        Index('idx_deal_score_active', 'deal_score', 'is_active'),
        Index('idx_product_score', 'product_name', 'deal_score'),
    )
    
    def __repr__(self):
        return f"<DealScore(product='{self.product_name}', score={self.deal_score})>"
