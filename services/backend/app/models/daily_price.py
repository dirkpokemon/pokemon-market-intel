"""
Daily Price Model (reference from the analysis service, which writes it)
One aggregate of comparable listings per product per day (price history).

raw_prices only keeps a few days (every scrape stores ~340k listings, too much
for a small Postgres volume); this table keeps the long history that market
statistics and deal scores need, at a few thousand rows per day.
"""

from sqlalchemy import Column, Date, DateTime, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class DailyPrice(Base):
    __tablename__ = "daily_prices"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Product identity (see DAILY_AGGREGATES_SQL): lowercased, whitespace-collapsed
    # name and set, category and variant ('' for sealed)
    name_key = Column(String(500), nullable=False)
    set_key = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)
    card_key = Column(String(100), nullable=False)
    # Listing language (EN, JP, ...): part of the product identity
    language = Column(String(10), nullable=False, server_default="EN")
    day = Column(Date, nullable=False, index=True)

    # Display labels as scraped
    product_name = Column(String(500), nullable=False)
    product_set = Column(String(255))
    collector_number = Column(String(50))
    rarity = Column(String(100))

    # EUR, comparable listings only
    median_price = Column(Numeric(10, 2), nullable=False)
    p10_price = Column(Numeric(10, 2), nullable=False)
    min_price = Column(Numeric(10, 2), nullable=False)
    max_price = Column(Numeric(10, 2), nullable=False)
    listings = Column(Integer, nullable=False)  # listing observations that day (all scrapes)
    last_seen_at = Column(DateTime(timezone=True))

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("name_key", "set_key", "category", "card_key", "language", "day", name="uq_daily_prices_product_lang_day"),
    )

    def __repr__(self):
        return f"<DailyPrice(product='{self.product_name}', day={self.day}, median={self.median_price})>"
