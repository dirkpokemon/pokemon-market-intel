"""
WatchlistItem Model
Stores per-user price target watchlist entries.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class WatchlistItem(Base):
    """Per-user card watchlist with price-target alerts."""

    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    card_name = Column(String(255), nullable=False)
    card_set = Column(String(255))
    target_price = Column(Numeric(10, 2), nullable=False)
    current_price = Column(Numeric(10, 2))  # cached by analysis service
    is_active = Column(Boolean, default=True, nullable=False)
    notified_at = Column(DateTime(timezone=True))  # last alert sent
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
