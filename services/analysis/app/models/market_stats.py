"""
Market Statistics Model
Stores calculated market metrics per product
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Index
from sqlalchemy.sql import func

from app.database import Base


class MarketStats(Base):
    """
    Market statistics per product (card/sealed product)
    """
    
    __tablename__ = "market_statistics"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Product identification
    product_name = Column(String(500), nullable=False, index=True)
    product_set = Column(String(255), index=True)
    category = Column(String(50))  # single, sealed
    
    # 7-day statistics
    avg_price_7d = Column(Numeric(10, 2))
    min_price_7d = Column(Numeric(10, 2))
    max_price_7d = Column(Numeric(10, 2))
    volume_7d = Column(Integer)  # Number of listings
    
    # 30-day statistics
    avg_price_30d = Column(Numeric(10, 2))
    min_price_30d = Column(Numeric(10, 2))
    max_price_30d = Column(Numeric(10, 2))
    volume_30d = Column(Integer)
    
    # Trends
    price_trend_7d = Column(Numeric(5, 2))  # Percentage change
    price_trend_30d = Column(Numeric(5, 2))
    volume_trend_7d = Column(Numeric(5, 2))
    volume_trend_30d = Column(Numeric(5, 2))
    
    # Market metrics
    liquidity_score = Column(Numeric(5, 2))  # 0-100
    volatility = Column(Numeric(5, 2))  # Coefficient of variation
    
    # Metadata
    sample_size = Column(Integer)
    data_quality = Column(String(20))  # excellent, good, fair, poor
    
    calculated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    __table_args__ = (
        Index('idx_product_name_calculated', 'product_name', 'calculated_at'),
        Index('idx_product_set_calculated', 'product_set', 'calculated_at'),
    )
    
    def __repr__(self):
        return f"<MarketStats(product='{self.product_name}', avg_7d={self.avg_price_7d})>"
