"""
Raw Price Model (Reference from Scraper Service)
Read-only access to all scraped price data
"""

from sqlalchemy import Column, Integer, String, Numeric, DateTime

from app.database import Base


class RawPrice(Base):
    """
    Append-only raw price data from scrapers (read-only)
    Contains ALL scraped listings from CardTrader, eBay, etc.
    """
    
    __tablename__ = "raw_prices"
    
    id = Column(Integer, primary_key=True)
    card_name = Column(String(500))
    card_set = Column(String(255))
    card_number = Column(String(100))
    condition = Column(String(50))
    language = Column(String(10))
    price = Column(Numeric(10, 2))
    currency = Column(String(3))
    source = Column(String(255))
    source_url = Column(String(1000))
    seller_name = Column(String(255))
    seller_rating = Column(Numeric(3, 2))
    stock_quantity = Column(Integer)
    scraped_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True))
