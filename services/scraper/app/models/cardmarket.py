"""
Cardmarket price guide tables.

cardmarket_prices: Cardmarket's public price guide for Pokémon (downloaded
once a night, ~80k products), replaced in full on every import.
cardmarket_map: which Cardmarket products belong to a CardTrader blueprint
(CardTrader's blueprint.card_market_ids), so prices join on our card_number.
"""

from sqlalchemy import Column, DateTime, Integer, Numeric, String
from sqlalchemy.sql import func

from app.database import Base


class CardmarketPrice(Base):
    __tablename__ = "cardmarket_prices"

    id_product = Column(Integer, primary_key=True)
    id_category = Column(Integer)
    avg = Column(Numeric(12, 2))     # average sell price
    low = Column(Numeric(12, 2))     # lowest offer
    trend = Column(Numeric(12, 2))   # Cardmarket's trend price
    avg1 = Column(Numeric(12, 2))
    avg7 = Column(Numeric(12, 2))
    avg30 = Column(Numeric(12, 2))
    guide_created_at = Column(DateTime(timezone=True))  # createdAt of the downloaded file


class CardmarketMap(Base):
    __tablename__ = "cardmarket_map"

    card_number = Column(String(100), primary_key=True)  # CardTrader blueprint id
    id_product = Column(Integer, primary_key=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
