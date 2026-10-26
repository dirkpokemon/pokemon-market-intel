"""
Public price check (no login): "is this a fair price?"

1. GET /price-check/search?q=…  — paste a card name or a whole listing
   ("Charizard ex 199 Obsidian Flames — Vinted — € 45"); returns matching
   products from market_statistics plus the euro amount found in the text.
2. GET /price-check?name=…&set=…&category=…&price=…  — the verdict for one
   product (see app/core/price_check.py for the thresholds).

Products are addressed by name/set/category rather than id, because the
analysis service replaces market_statistics on every run.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.language import RAW_LANG_SQL
from app.core.price_check import judge_price, parse_listing
from app.core.rate_limit import RateLimiter
from app.database import get_db
from app.utils.cache import public_cache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/price-check", tags=["Price check"])

search_limit = RateLimiter(limit=60, window_seconds=60)
check_limit = RateLimiter(limit=30, window_seconds=60)


class ProductMatch(BaseModel):
    product_name: str
    product_set: Optional[str] = None
    category: str
    card_number: Optional[str] = None
    collector_number: Optional[str] = None
    rarity: Optional[str] = None
    language: str = "EN"
    floor_price: Optional[float] = None
    typical_price: Optional[float] = None
    days_observed: Optional[int] = None


class SearchResponse(BaseModel):
    terms: List[str]
    detected_price: Optional[float] = None
    results: List[ProductMatch]


class Reference(BaseModel):
    floor_price: float
    typical_price: float
    current_price: Optional[float] = None
    min_price_30d: Optional[float] = None
    max_price_30d: Optional[float] = None
    price_trend_30d: Optional[float] = None
    days_observed: int
    observations: int
    last_seen_at: Optional[datetime] = None
    calculated_at: Optional[datetime] = None
    market_signal: Optional[str] = None
    floor_change_7d: Optional[float] = None
    supply_change_7d: Optional[float] = None


class VerdictOut(BaseModel):
    code: str
    pct_vs_floor: float
    pct_vs_typical: float
    fair_offer_low: float
    fair_offer_high: float
    low_data: bool


class GradedOffers(BaseModel):
    """Graded (slabbed) copies on offer now. CardTrader doesn't say which grade or company."""
    min_price: float
    listings: int


class CheckResponse(BaseModel):
    product_name: str
    product_set: Optional[str] = None
    category: str
    card_number: Optional[str] = None
    collector_number: Optional[str] = None
    rarity: Optional[str] = None
    language: str = "EN"
    price: float
    verdict: VerdictOut
    reference: Reference
    graded: Optional[GradedOffers] = None
    basis: str


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _f(value) -> Optional[float]:
    return float(value) if value is not None else None


@router.get("/search", response_model=SearchResponse, dependencies=[Depends(search_limit)])
async def search_products(
    q: str = Query(..., min_length=2, max_length=300, description="Kaartnaam of geplakte advertentie"),
    db: AsyncSession = Depends(get_db),
) -> SearchResponse:
    terms, detected_price = parse_listing(q)
    if not terms:
        return SearchResponse(terms=[], detected_price=detected_price, results=[])

    # "japans" / "japanese" / "jp" in the text: show Japanese prints first
    jp_words = {"jp", "jap", "japans", "japanse", "japanese", "jpn"}
    want_lang = "JP" if jp_words & {t.lower() for t in terms} else "EN"
    terms = [t for t in terms if t.lower() not in jp_words] or terms
    cache_key = f"pc-search:{want_lang}:" + " ".join(terms)
    cached = public_cache.get(cache_key)
    if cached is None:
        params = {f"t{i}": f"%{_escape_like(t)}%" for i, t in enumerate(terms)}
        # Every term must appear in the name, set, number or rarity; drop trailing terms until
        # something matches, so one unknown word ("Vinted-deal") doesn't kill the search.
        rows = []
        for n in range(len(terms), 0, -1):
            conditions = " AND ".join(
                f"(product_name || ' ' || COALESCE(product_set, '') || ' ' || COALESCE(collector_number, '')"
                f" || ' ' || COALESCE(rarity, '')) ILIKE :t{i} ESCAPE '\\'"
                for i in range(n)
            )
            result = await db.execute(
                text(f"""
                    SELECT product_name, product_set, category, card_number,
                           collector_number, rarity, COALESCE(language, 'EN') AS language,
                           floor_price_30d, avg_price_30d, days_observed
                    FROM market_statistics
                    WHERE {conditions}
                    ORDER BY (COALESCE(language, 'EN') = :want_lang) DESC,
                             days_observed DESC NULLS LAST, volume_30d DESC NULLS LAST
                    LIMIT 8
                """),
                {"want_lang": want_lang, **{k: v for k, v in params.items() if int(k[1:]) < n}},
            )
            rows = result.fetchall()
            if rows:
                break
        cached = [
            ProductMatch(
                product_name=r.product_name,
                product_set=r.product_set,
                category=r.category or "single",
                card_number=r.card_number or None,
                collector_number=r.collector_number,
                rarity=r.rarity,
                language=r.language,
                floor_price=_f(r.floor_price_30d),
                typical_price=_f(r.avg_price_30d),
                days_observed=r.days_observed,
            )
            for r in rows
        ]
        public_cache.set(cache_key, cached, ttl_seconds=600)

    return SearchResponse(terms=terms, detected_price=detected_price, results=cached)


@router.get("", response_model=CheckResponse, dependencies=[Depends(check_limit)])
async def check_price(
    name: str = Query(..., min_length=1, max_length=500),
    price: float = Query(..., gt=0, lt=1_000_000, description="Gevraagde prijs in euro"),
    set: Optional[str] = Query(default=None, max_length=255),
    category: str = Query(default="single", pattern="^(single|sealed)$"),
    card_number: Optional[str] = Query(default=None, max_length=100, description="Variant uit de zoekresultaten"),
    language: str = Query(default="EN", pattern="^(EN|JP)$", description="Taal van de kaart"),
    db: AsyncSession = Depends(get_db),
) -> CheckResponse:
    result = await db.execute(
        text("""
            SELECT product_name, product_set, category, card_number, collector_number, rarity,
                   COALESCE(language, 'EN') AS language,
                   floor_price_30d, avg_price_30d,
                   current_price, min_price_30d, max_price_30d, price_trend_30d,
                   days_observed, sample_size, last_seen_at, calculated_at,
                   market_signal, floor_change_7d, supply_change_7d
            FROM market_statistics
            WHERE lower(product_name) = lower(:name)
              AND lower(COALESCE(product_set, '')) = lower(COALESCE(:set, ''))
              AND category = :category
              AND (CAST(:card AS text) IS NULL OR COALESCE(card_number, '') = CAST(:card AS text))
              AND COALESCE(language, 'EN') = :language
            ORDER BY days_observed DESC NULLS LAST, calculated_at DESC
            LIMIT 1
        """),
        {
            "name": name.strip(),
            "set": set.strip() if set else None,
            "category": category,
            "card": card_number.strip() if card_number else None,
            "language": language,
        },
    )
    row = result.fetchone()
    if row is None or not row.floor_price_30d or not row.avg_price_30d:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voor dit product hebben we (nog) niet genoeg prijsdata.",
        )

    floor, typical = float(row.floor_price_30d), float(row.avg_price_30d)
    days = int(row.days_observed or 0)
    observations = int(row.sample_size or 0)
    verdict = judge_price(price, floor, typical, days, observations)

    graded = None
    if row.card_number:
        g = (await db.execute(
            text(f"""
                SELECT min(price) AS min_price, count(*) AS listings
                FROM raw_prices
                WHERE card_number = :card
                  AND graded = true
                  AND price > 0
                  AND upper(COALESCE(currency, 'EUR')) = 'EUR'
                  AND scraped_at >= :since
                  AND {RAW_LANG_SQL} = :language
            """),
            {"card": row.card_number, "language": row.language,
             "since": datetime.now(timezone.utc) - timedelta(hours=26)},
        )).fetchone()
        if g and g.listings:
            graded = GradedOffers(min_price=float(g.min_price), listings=int(g.listings))

    return CheckResponse(
        product_name=row.product_name,
        product_set=row.product_set,
        category=row.category,
        card_number=row.card_number or None,
        collector_number=row.collector_number,
        rarity=row.rarity,
        language=row.language,
        price=price,
        verdict=VerdictOut(**verdict.__dict__),
        graded=graded,
        basis=(
            "Vraagprijzen van vergelijkbare aanbiedingen op CardTrader (singles: near-mint, "
            + ("Japanstalig" if row.language == "JP" else "Engelstalig")
            + "), laatste 30 dagen."
        ),
        reference=Reference(
            floor_price=floor,
            typical_price=typical,
            current_price=_f(row.current_price),
            min_price_30d=_f(row.min_price_30d),
            max_price_30d=_f(row.max_price_30d),
            price_trend_30d=_f(row.price_trend_30d),
            days_observed=days,
            observations=observations,
            last_seen_at=row.last_seen_at,
            calculated_at=row.calculated_at,
            market_signal=row.market_signal,
            floor_change_7d=_f(row.floor_change_7d),
            supply_change_7d=_f(row.supply_change_7d),
        ),
    )
