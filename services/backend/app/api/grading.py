"""
Public grading calculator data (no login): GET /grading?name=…&set=…&card_number=…&language=…

Returns the card's raw reference price (market_statistics), what graded copies
of it are on offer on CardTrader right now, per grading company and grade
where the seller's description says so, and the grading cost presets. The
calculation itself happens in the browser (see frontend lib/grading.ts).
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.grading import DEFAULT_SELLING_FEE_PCT, GRADING_SERVICES, PRESETS_CHECKED
from app.core.language import LANGUAGE_PATTERN, RAW_LANG_SQL
from app.core.rate_limit import RateLimiter
from app.database import get_db

router = APIRouter(prefix="/grading", tags=["Grading"])
limit = RateLimiter(limit=30, window_seconds=60)


class RawReference(BaseModel):
    floor_price: float
    typical_price: float
    days_observed: int
    observations: int


class GradedOffer(BaseModel):
    company: Optional[str] = None   # None: the description doesn't say
    grade: Optional[float] = None
    min_price: float
    listings: int


class GradingService(BaseModel):
    id: str
    label: str
    fee: float
    shipping: float
    turnaround: str
    note: str


class GradingResponse(BaseModel):
    product_name: str
    product_set: Optional[str] = None
    card_number: str
    collector_number: Optional[str] = None
    rarity: Optional[str] = None
    language: str
    raw: RawReference
    graded: List[GradedOffer]
    services: List[GradingService]
    presets_checked: str
    selling_fee_pct: float


@router.get("", response_model=GradingResponse, dependencies=[Depends(limit)])
async def grading_data(
    name: str = Query(..., min_length=1, max_length=500),
    card_number: str = Query(..., min_length=1, max_length=100),
    set: Optional[str] = Query(default=None, max_length=255),
    language: str = Query(default="EN", pattern=LANGUAGE_PATTERN),
    db: AsyncSession = Depends(get_db),
) -> GradingResponse:
    row = (await db.execute(
        text("""
            SELECT product_name, product_set, card_number, collector_number, rarity,
                   COALESCE(language, 'EN') AS language,
                   floor_price_30d, avg_price_30d, days_observed, sample_size
            FROM market_statistics
            WHERE lower(product_name) = lower(:name)
              AND lower(COALESCE(product_set, '')) = lower(COALESCE(:set, ''))
              AND category = 'single'
              AND COALESCE(card_number, '') = :card
              AND COALESCE(language, 'EN') = :language
            ORDER BY days_observed DESC NULLS LAST
            LIMIT 1
        """),
        {"name": name.strip(), "set": set.strip() if set else None, "card": card_number.strip(), "language": language},
    )).fetchone()
    if row is None or not row.floor_price_30d or not row.avg_price_30d:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voor deze kaart hebben we (nog) niet genoeg prijsdata.",
        )

    offers = (await db.execute(
        text(f"""
            SELECT grading_company AS company, grade, min(price) AS min_price, count(*) AS listings
            FROM raw_prices
            WHERE card_number = :card
              AND graded = true
              AND price > 0
              AND upper(COALESCE(currency, 'EUR')) = 'EUR'
              AND scraped_at >= :since
              AND {RAW_LANG_SQL} = :language
            GROUP BY grading_company, grade
            ORDER BY grading_company NULLS LAST, grade DESC NULLS LAST
        """),
        {"card": row.card_number, "language": row.language,
         "since": datetime.now(timezone.utc) - timedelta(hours=26)},
    )).fetchall()

    return GradingResponse(
        product_name=row.product_name,
        product_set=row.product_set,
        card_number=row.card_number,
        collector_number=row.collector_number,
        rarity=row.rarity,
        language=row.language,
        raw=RawReference(
            floor_price=float(row.floor_price_30d),
            typical_price=float(row.avg_price_30d),
            days_observed=int(row.days_observed or 0),
            observations=int(row.sample_size or 0),
        ),
        graded=[
            GradedOffer(
                company=o.company,
                grade=float(o.grade) if o.grade is not None else None,
                min_price=float(o.min_price),
                listings=int(o.listings),
            )
            for o in offers
        ],
        services=[GradingService(**s) for s in GRADING_SERVICES],
        presets_checked=PRESETS_CHECKED,
        selling_fee_pct=DEFAULT_SELLING_FEE_PCT,
    )
