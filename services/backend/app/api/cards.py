"""
Public card pages for search engines (no login).

GET /cards               every single with statistics, for the sitemap
GET /cards/{card_number}?language=EN   one card: price summary, its other
                         languages and other cards from the same set

Cards are addressed by card_number (the CardTrader blueprint id) and
language, which survive the analysis replacing market_statistics every run.
Only summary numbers are public; the daily price history stays a Plus
feature (/price_history). Not rate-limited: the frontend server renders these
pages for every visitor and crawler from one IP, and both queries are cheap
(market_statistics holds a few thousand rows; the list is cached).
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cardmarket import CardmarketPrices, cardmarket_prices
from app.core.language import LANGUAGE_PATTERN
from app.database import get_db
from app.utils.cache import public_cache

router = APIRouter(prefix="/cards", tags=["Card pages"])


class CardRef(BaseModel):
    card_number: str
    language: str
    product_name: str
    product_set: Optional[str] = None
    collector_number: Optional[str] = None
    rarity: Optional[str] = None
    floor_price: Optional[float] = None
    calculated_at: Optional[datetime] = None


class CardPage(BaseModel):
    card: CardRef
    typical_price: Optional[float] = None
    current_price: Optional[float] = None
    min_price_30d: Optional[float] = None
    max_price_30d: Optional[float] = None
    price_trend_30d: Optional[float] = None
    days_observed: int
    observations: int
    market_signal: Optional[str] = None
    floor_change_7d: Optional[float] = None
    supply_change_7d: Optional[float] = None
    other_languages: List[CardRef]
    same_set: List[CardRef]
    cardmarket: Optional[CardmarketPrices] = None  # all languages together; see app/core/cardmarket.py


def _f(v) -> Optional[float]:
    return float(v) if v is not None else None


def _ref(r) -> CardRef:
    return CardRef(
        card_number=r.card_number,
        language=r.language,
        product_name=r.product_name,
        product_set=r.product_set,
        collector_number=r.collector_number,
        rarity=r.rarity,
        floor_price=_f(r.floor_price_30d),
        calculated_at=r.calculated_at,
    )


# One row per card variant and language (the analysis can briefly hold more)
_CARDS_SQL = """
    SELECT DISTINCT ON (card_number, COALESCE(language, 'EN'))
           card_number, COALESCE(language, 'EN') AS language, product_name, product_set,
           collector_number, rarity, floor_price_30d, calculated_at
    FROM market_statistics
    WHERE category = 'single' AND COALESCE(card_number, '') <> '' AND floor_price_30d IS NOT NULL
    {extra}
    ORDER BY card_number, COALESCE(language, 'EN'), days_observed DESC NULLS LAST
"""


@router.get("", response_model=List[CardRef])
async def list_cards(db: AsyncSession = Depends(get_db)) -> List[CardRef]:
    cached = public_cache.get("cards:all")
    if cached is None:
        rows = (await db.execute(text(_CARDS_SQL.format(extra="")))).fetchall()
        cached = [_ref(r) for r in rows]
        public_cache.set("cards:all", cached, ttl_seconds=3600)
    return cached


@router.get("/{card_number}", response_model=CardPage)
async def card_page(
    card_number: str,
    language: str = Query(default="EN", pattern=LANGUAGE_PATTERN),
    db: AsyncSession = Depends(get_db),
) -> CardPage:
    row = (await db.execute(
        text("""
            SELECT card_number, COALESCE(language, 'EN') AS language, product_name, product_set,
                   collector_number, rarity, floor_price_30d, avg_price_30d, current_price,
                   min_price_30d, max_price_30d, price_trend_30d, days_observed, sample_size,
                   market_signal, floor_change_7d, supply_change_7d, calculated_at
            FROM market_statistics
            WHERE category = 'single' AND card_number = :card AND COALESCE(language, 'EN') = :lang
              AND floor_price_30d IS NOT NULL
            ORDER BY days_observed DESC NULLS LAST
            LIMIT 1
        """),
        {"card": card_number, "lang": language},
    )).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deze kaart kennen we (nog) niet.")

    others = (await db.execute(
        text(_CARDS_SQL.format(extra="AND card_number = :card AND COALESCE(language, 'EN') <> :lang")),
        {"card": card_number, "lang": language},
    )).fetchall()
    same_set = (await db.execute(
        text(f"""
            SELECT * FROM ({_CARDS_SQL.format(extra="AND lower(product_set) = lower(:set) AND COALESCE(language, 'EN') = :lang AND card_number <> :card")}) s
            ORDER BY floor_price_30d DESC NULLS LAST
            LIMIT 12
        """),
        {"card": card_number, "lang": language, "set": row.product_set or ""},
    )).fetchall()

    return CardPage(
        card=_ref(row),
        typical_price=_f(row.avg_price_30d),
        current_price=_f(row.current_price),
        min_price_30d=_f(row.min_price_30d),
        max_price_30d=_f(row.max_price_30d),
        price_trend_30d=_f(row.price_trend_30d),
        days_observed=int(row.days_observed or 0),
        observations=int(row.sample_size or 0),
        market_signal=row.market_signal,
        floor_change_7d=_f(row.floor_change_7d),
        supply_change_7d=_f(row.supply_change_7d),
        other_languages=[_ref(r) for r in others],
        same_set=[_ref(r) for r in same_set],
        cardmarket=await cardmarket_prices(db, row.card_number),
    )
