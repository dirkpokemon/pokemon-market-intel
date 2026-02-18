"""
Scrape Log Model
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func

from app.database import Base


class ScrapeLog(Base):
    """
    Log of scraping sessions
    """

    __tablename__ = "scrape_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Session Information
    source = Column(String(255), nullable=False, index=True)
    status = Column(String(50), nullable=False)  # success, failed, partial
    
    # Statistics
    items_scraped = Column(Integer, default=0)
    errors_count = Column(Integer, default=0)
    
    # Timing
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)
    
    # Error Details
    error_message = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<ScrapeLog(id={self.id}, source='{self.source}', status='{self.status}', items={self.items_scraped})>"
