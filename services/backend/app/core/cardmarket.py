"""
Cardmarket prices for one of our cards, from the scraper's import of
Cardmarket's public price guide (cardmarket_prices) joined through
cardmarket_map (CardTrader blueprint -> Cardmarket product).

Shown only when CARDMARKET_DISPLAY is on: the price guide is public, but
showing it on a commercial site needs Cardmarket's written permission first.
Cardmarket's numbers cover all languages of a card together.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings


class CardmarketPrices(BaseModel):
    trend: Optional[float] = None    # Cardmarket's trend price
    avg30: Optional[float] = None    # average sell price over 30 days
    low: Optional[float] = None      # lowest offer now
    updated_at: Optional[datetime] = None


def _f(v) -> Optional[float]:
    return float(v) if v is not None else None


async def cardmarket_prices(db: AsyncSession, card_number: Optional[str]) -> Optional[CardmarketPrices]:
    if not settings.CARDMARKET_DISPLAY or not card_number:
        return None
    try:
        row = (await db.execute(
            text("""
                SELECT p.trend, p.avg30, p.low, p.guide_created_at
                FROM cardmarket_map m
                JOIN cardmarket_prices p ON p.id_product = m.id_product
                WHERE m.card_number = :card AND p.trend IS NOT NULL
                -- several Cardmarket products per blueprint: the one with the most history
                ORDER BY (p.avg30 IS NOT NULL) DESC, p.id_product
                LIMIT 1
            """),
            {"card": card_number},
        )).fetchone()
    except Exception:  # tables not there yet: show nothing rather than fail the page
        await db.rollback()
        return None
    if row is None:
        return None
    return CardmarketPrices(trend=_f(row.trend), avg30=_f(row.avg30), low=_f(row.low), updated_at=row.guide_created_at)
