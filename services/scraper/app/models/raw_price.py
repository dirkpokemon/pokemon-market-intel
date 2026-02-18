"""
Raw Price Database Model
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Index
from sqlalchemy.sql import func

from app.database import Base


class RawPrice(Base):
    """
    Append-only raw price data from scrapers
    """

    __tablename__ = "raw_prices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Card Information
    card_name = Column(String(500), nullable=False, index=True)
    card_set = Column(String(255), index=True)
    card_number = Column(String(100))
    condition = Column(String(50))  # Near Mint, Lightly Played, etc.
    language = Column(String(10), default="EN")
    
    # Price Information
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="EUR")
    
    # Source Information
    source = Column(String(255), nullable=False, index=True)
    source_url = Column(String(1000))
    seller_name = Column(String(255))
    seller_rating = Column(Numeric(3, 2))
    stock_quantity = Column(Integer)
    
    # Timestamps
    scraped_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Indexes for common queries
    __table_args__ = (
        Index('idx_card_name_scraped', 'card_name', 'scraped_at'),
        Index('idx_source_scraped', 'source', 'scraped_at'),
        Index('idx_card_set_name', 'card_set', 'card_name'),
    )

    def __repr__(self):
        return f"<RawPrice(id={self.id}, card='{self.card_name}', price={self.price}, source='{self.source}')>"
