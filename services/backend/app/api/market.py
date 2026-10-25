"""
Market Data API endpoints
Provides access to deal scores, market statistics, sets, and full catalog search
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func, text
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.schemas.market import (
    DealScoreResponse, MarketStatsResponse,
    CardSearchResult, SearchResponse,
)
from app.core.dependencies import get_current_admin_user, get_current_premium_user, get_current_user
from app.data.set_registry import SETS, ERAS as SET_ERAS, aliases_for
from app.utils.cache import public_cache


logger = logging.getLogger(__name__)
router = APIRouter(tags=["Market Data"])


def _aliases_or_fallback(set_slug: Optional[str], product_set: Optional[str]) -> List[str]:
    """
    Resolve a set_slug to its aliases; if slug unknown but product_set given,
    fall back to [product_set] so legacy callers still work. Returns [] if
    neither is usable.
    """
    if set_slug:
        al = aliases_for(set_slug)
        if al:
            return al
    if product_set and product_set.strip():
        # Legacy fallback: also include the short-name after stripping "XX: " prefix
        ps = product_set.strip()
        short = ps.split(": ", 1)[1].strip() if ": " in ps else ps
        return [ps] if ps == short else [ps, short]
    return []


def _ilike_any_set(column, aliases: List[str]):
    """
    Build SQLAlchemy OR-of-ILIKE clause across set name aliases. Returns None
    if aliases is empty (caller should skip the filter).

    Uses exact case-insensitive matching (no wildcards) so short aliases like
    'XY' or '151' don't accidentally match unrelated sets.
    """
    if not aliases:
        return None
    from sqlalchemy import or_ as sa_or
    clauses = [
        column.ilike(_escape_ilike_pattern(a), escape="\\")
        for a in aliases
    ]
    return sa_or(*clauses) if len(clauses) > 1 else clauses[0]


def _escape_ilike_pattern(value: str) -> str:
    """Escape % and _ for PostgreSQL ILIKE with ESCAPE '\\'."""
    return (
        value.replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_")
    )


@router.get("/deal_scores", response_model=List[DealScoreResponse])
async def get_deal_scores(
    limit: int = Query(default=50, le=100, description="Maximum number of deal scores to return"),
    min_score: float = Query(default=0, ge=0, le=100, description="Minimum deal score"),
    category: Optional[str] = Query(default=None, description="Filter by category (single/sealed)"),
    set_slug: Optional[str] = Query(default=None, description="Canonical set slug (preferred). Resolves to registry aliases."),
    product_set: Optional[str] = Query(default=None, description="[DEPRECATED] Filter by product set string. Prefer set_slug."),
    product_name: Optional[str] = Query(default=None, description="Filter by product name (substring, case-insensitive)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get deal scores for products
    
    **Free tier:** Limited to top 20 deals (score ≥ 55)
    **Premium tier:** Full access to all deals
    
    Returns active deal scores sorted by score (highest first)
    
    - **limit**: Maximum number of scores (default: 50, max: 100)
    - **min_score**: Minimum deal score filter (0-100)
    - **category**: Filter by category (single or sealed)
    - **product_set**: Filter by card set name (case-insensitive match)
    - **product_name**: Filter by card name substring (case-insensitive)
    """
    logger.info(f"User {current_user.email} fetching deal scores")
    
    # Import DealScore model
    from app.models.deal_score import DealScore
    
    # Apply free tier limits (generous sample; premium gets full catalog)
    # Exception: when browsing a specific set, always show cards (no score gate)
    # so every user can explore set content — limit still applies
    if not current_user.is_premium():
        if not (set_slug or product_set):
            min_score = max(min_score, 55)
        limit = min(limit, 20)

    # Build query
    query = select(DealScore).where(
        and_(
            DealScore.is_active == True,
            DealScore.deal_score >= min_score
        )
    )

    if category:
        query = query.where(DealScore.category == category)

    aliases = _aliases_or_fallback(set_slug, product_set)
    set_clause = _ilike_any_set(DealScore.product_set, aliases)
    if set_clause is not None:
        query = query.where(set_clause)

    if product_name:
        pn = product_name.strip()
        if pn:
            esc = _escape_ilike_pattern(pn)
            query = query.where(DealScore.product_name.ilike(f"%{esc}%", escape="\\"))

    # Order by deal score (desc)
    query = query.order_by(desc(DealScore.deal_score)).limit(limit)
    
    result = await db.execute(query)
    deal_scores = result.scalars().all()
    
    logger.info(f"Returning {len(deal_scores)} deal scores (min_score: {min_score})")
    
    return [DealScoreResponse.from_orm(score) for score in deal_scores]


@router.get("/deal_scores/sets")
async def get_deal_score_sets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Return distinct product_set values that have active deal scores."""
    from app.models.deal_score import DealScore
    result = await db.execute(
        select(DealScore.product_set)
        .where(DealScore.is_active == True, DealScore.product_set.isnot(None))
        .distinct()
        .order_by(DealScore.product_set)
    )
    sets = [row[0] for row in result.all() if row[0]]
    return {"sets": sets, "count": len(sets)}


@router.get("/sets")
async def get_sets(
    has_data: bool = Query(default=False, description="Only return sets with active deal data"),
    db: AsyncSession = Depends(get_db),
):
    """
    Return the canonical set registry, enriched with per-set data signals:

    - deal_count: number of active deal_scores rows matching any alias
    - cheapest_sealed: lowest sealed price (DealScore.current_price, category=sealed)

    This endpoint is the single source of truth for the frontend set list.
    Detail pages should use the returned `slug` when querying `/deal_scores`
    etc. via the `set_slug` param — no more client-side name stripping.
    """
    cache_key = f"sets:{has_data}"
    cached = public_cache.get(cache_key)
    if cached is not None:
        return cached

    from app.models.deal_score import DealScore

    # Fetch all active deal rows (set + category + price) once, then bucket
    # into sets in Python by alias-substring match. This avoids N+1 queries.
    result = await db.execute(
        select(
            DealScore.product_set,
            DealScore.category,
            DealScore.current_price,
        ).where(
            DealScore.is_active == True,
            DealScore.product_set.isnot(None),
        )
    )
    rows = result.all()

    # Pre-lowercase each alias per set for fast matching
    alias_index = [
        (s["slug"], [a.lower() for a in s["aliases"]])
        for s in SETS
    ]

    # Aggregate
    agg: Dict[str, Dict] = {
        s["slug"]: {"deal_count": 0, "cheapest_sealed": None}
        for s in SETS
    }
    for row in rows:
        db_name = (row.product_set or "").lower().strip()
        if not db_name:
            continue
        for slug, aliases in alias_index:
            # Exact normalized equality — bidirectional substring caused shorter base-set
            # names (e.g. "Crown Zenith") to be absorbed into longer sibling names
            # (e.g. "Crown Zenith: Galarian Gallery") declared earlier in the registry.
            if any(a == db_name for a in aliases):
                entry = agg[slug]
                entry["deal_count"] += 1
                if row.category == "sealed" and row.current_price is not None:
                    cp = float(row.current_price)
                    cur = entry["cheapest_sealed"]
                    if cur is None or cp < cur:
                        entry["cheapest_sealed"] = cp
                break  # first alias match wins — avoid double-counting

    # Build response
    out = []
    for s in SETS:
        info = agg[s["slug"]]
        if has_data and info["deal_count"] == 0:
            continue
        out.append({
            "slug": s["slug"],
            "name": s["name"],
            "set_code": s["set_code"],
            "era": s["era"],
            "tcg_api_id": s["tcg_api_id"],
            "cardmarket_slug": s["cardmarket_slug"],
            "deal_count": info["deal_count"],
            "cheapest_sealed": info["cheapest_sealed"],
        })

    response = {
        "eras": SET_ERAS,
        "sets": out,
        "total": len(out),
    }
    public_cache.set(cache_key, response)
    return response


@router.get("/sets/unmatched")
async def get_unmatched_sets(
    _: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns distinct product_set values in market_stats that don't match
    any alias in the set registry. Use to discover newly scraped sets that
    need to be added to set_registry.py. Admin only (maintenance endpoint).
    """
    from app.models.market_stats import MarketStats

    # Collect all known aliases (lowercase)
    known = {a.lower() for s in SETS for a in s.get("aliases", [])}

    result = await db.execute(
        select(func.distinct(MarketStats.product_set)).where(
            MarketStats.product_set.isnot(None)
        )
    )
    db_sets = [r[0] for r in result.fetchall() if r[0]]

    unmatched = sorted(s for s in db_sets if s.lower() not in known)
    return {"unmatched": unmatched, "count": len(unmatched)}


@router.get("/sealed_prices")
async def get_sealed_prices(
    set_slug: Optional[str] = Query(default=None, description="Canonical set slug (preferred)."),
    set_name: Optional[str] = Query(default=None, description="[DEPRECATED] Set name. Prefer set_slug."),
    days: int = Query(default=14, le=60, description="How many days back to look"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get sealed product prices for a given set.

    Queries raw_prices where card_number IS NULL (sealed detection logic) and
    aggregates by product name to return min/avg/max price per product.
    """
    from datetime import datetime, timedelta, timezone
    from app.models.raw_price import RawPrice

    aliases = _aliases_or_fallback(set_slug, set_name)
    if not aliases:
        return []

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    set_clause = _ilike_any_set(RawPrice.card_set, aliases)

    # Aggregate: for each distinct product name in this set, get price stats
    stmt = (
        select(
            RawPrice.card_name,
            RawPrice.source,
            RawPrice.source_url,
            func.min(RawPrice.price).label("min_price"),
            func.avg(RawPrice.price).label("avg_price"),
            func.max(RawPrice.price).label("max_price"),
            func.count(RawPrice.id).label("listing_count"),
            func.max(RawPrice.scraped_at).label("last_seen"),
        )
        .where(
            and_(
                RawPrice.card_number.is_(None),          # sealed products have no card_number
                set_clause,
                RawPrice.scraped_at >= cutoff,
                RawPrice.price > 0,
            )
        )
        .group_by(RawPrice.card_name, RawPrice.source, RawPrice.source_url)
        .order_by(RawPrice.card_name)
        .limit(50)
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "product_name": row.card_name,
            "source": row.source,
            "source_url": row.source_url,
            "min_price": float(row.min_price),
            "avg_price": float(row.avg_price),
            "max_price": float(row.max_price),
            "listing_count": row.listing_count,
            "last_seen": row.last_seen.isoformat() if row.last_seen else None,
        }
        for row in rows
    ]


@router.get("/market_stats", response_model=List[MarketStatsResponse])
async def get_market_stats(
    limit: int = Query(default=50, le=100, description="Maximum number of stats to return"),
    set_slug: Optional[str] = Query(default=None, description="Canonical set slug (preferred)."),
    product_set: Optional[str] = Query(default=None, description="[DEPRECATED] Filter by product set. Prefer set_slug."),
    current_user: User = Depends(get_current_premium_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get market statistics for products
    
    **Plus/Business only** ("Full market stats & price history" on the pricing page)
    
    Returns market statistics sorted by calculation time (most recent first)
    
    - **limit**: Maximum number of stats (default: 50, max: 100)
    - **product_set**: Filter by card set name
    """
    logger.info(f"User {current_user.email} fetching market stats")
    
    # Import MarketStats model
    from app.models.market_stats import MarketStats
    
    # Build query
    query = select(MarketStats)

    aliases = _aliases_or_fallback(set_slug, product_set)
    set_clause = _ilike_any_set(MarketStats.product_set, aliases)
    if set_clause is not None:
        query = query.where(set_clause)

    # Order by most recent
    query = query.order_by(desc(MarketStats.calculated_at)).limit(limit)
    
    result = await db.execute(query)
    stats = result.scalars().all()
    
    logger.info(f"Returning {len(stats)} market stats")
    
    return [MarketStatsResponse.from_orm(stat) for stat in stats]


# ─── Full Catalog Search ──────────────────────────────────────────

@router.get("/search", response_model=SearchResponse)
async def search_cards(
    q: str = Query(..., min_length=2, max_length=200, description="Search query (card name, set, etc.)"),
    limit: int = Query(default=20, le=50, description="Maximum results to return"),
    sort_by: str = Query(default="relevance", description="Sort by: relevance, price_asc, price_desc, listings"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Search the FULL card catalog (171K+ listings from raw_prices)
    
    Searches across all scraped cards, not just analyzed deals.
    Results are grouped by card name + set and aggregated.
    
    **Available to all logged-in users**
    
    - **q**: Search query (min 2 chars)
    - **limit**: Max results (default: 20, max: 50)
    - **sort_by**: relevance, price_asc, price_desc, listings
    """
    logger.info(f"User {current_user.email} searching: '{q}'")
    
    from app.models.raw_price import RawPrice
    from app.models.deal_score import DealScore
    
    search_term = f"%{_escape_ilike_pattern(q.lower())}%"
    
    # Aggregate raw_prices by (card_name, card_set) — returns unique products
    # with min/avg/max prices, listing count, and most recent scrape time
    search_query = text("""
        SELECT 
            card_name,
            card_set,
            MIN(price)::float AS min_price,
            AVG(price)::float AS avg_price,
            MAX(price)::float AS max_price,
            COUNT(*)::int AS listings,
            MAX(condition) AS condition,
            MAX(source) AS source,
            MAX(source_url) AS source_url,
            MAX(scraped_at) AS last_seen
        FROM raw_prices
        WHERE LOWER(card_name) LIKE :search_term ESCAPE '\\'
           OR LOWER(card_set) LIKE :search_term ESCAPE '\\'
        GROUP BY card_name, card_set
        ORDER BY
            CASE WHEN :sort_by = 'price_asc'  THEN MIN(price) END ASC,
            CASE WHEN :sort_by = 'price_desc' THEN MIN(price) END DESC,
            CASE WHEN :sort_by = 'listings'   THEN COUNT(*)   END DESC,
            COUNT(*) DESC,
            card_name ASC
        LIMIT :limit
    """)
    
    result = await db.execute(
        search_query,
        {"search_term": search_term, "sort_by": sort_by, "limit": limit}
    )
    rows = result.fetchall()
    
    # Count total matching unique products (for "has_more")
    count_query = text("""
        SELECT COUNT(DISTINCT (card_name, card_set))::int AS total
        FROM raw_prices
        WHERE LOWER(card_name) LIKE :search_term ESCAPE '\\'
           OR LOWER(card_set) LIKE :search_term ESCAPE '\\'
    """)
    count_result = await db.execute(count_query, {"search_term": search_term})
    total_count = count_result.scalar() or 0
    
    # Enrich results with deal scores if available
    # Deal names keep the scraped spelling but may differ in case/whitespace
    # between sources, so match on a lowercased, whitespace-collapsed key.
    def _name_key(name: Optional[str]) -> str:
        return " ".join((name or "").split()).lower()

    card_keys = list({_name_key(row.card_name) for row in rows})
    deal_score_map = {}
    if card_keys:
        deal_query = select(DealScore).where(
            and_(
                func.lower(DealScore.product_name).in_(card_keys),
                DealScore.is_active == True
            )
        )
        deal_result = await db.execute(deal_query)
        for ds in deal_result.scalars().all():
            deal_score_map[_name_key(ds.product_name)] = ds
    
    # Build response
    results = []
    for row in rows:
        ds = deal_score_map.get(_name_key(row.card_name))
        results.append(CardSearchResult(
            card_name=row.card_name,
            card_set=row.card_set,
            min_price=round(row.min_price, 2),
            avg_price=round(row.avg_price, 2),
            max_price=round(row.max_price, 2),
            listings=row.listings,
            condition=row.condition,
            source=row.source,
            source_url=row.source_url,
            last_seen=row.last_seen,
            deal_score=float(ds.deal_score) if ds else None,
            market_avg_price=float(ds.market_avg_price) if ds and ds.market_avg_price else None,
        ))
    
    logger.info(f"Search '{q}' returned {len(results)} results (total: {total_count})")
    
    return SearchResponse(
        query=q,
        total_results=total_count,
        results=results,
        has_more=total_count > limit,
    )


# ─── Bulk Data Import (for data migration) ────────────────────────

class RawPriceImport(BaseModel):
    card_name: str
    card_set: Optional[str] = None
    card_number: Optional[str] = None
    condition: Optional[str] = None
    language: Optional[str] = "EN"
    price: float
    currency: Optional[str] = "EUR"
    source: str = "cardtrader"
    source_url: Optional[str] = None
    seller_name: Optional[str] = None
    seller_rating: Optional[float] = None
    stock_quantity: Optional[int] = None
    scraped_at: Optional[str] = None


@router.post("/import/raw_prices")
async def import_raw_prices(
    records: List[RawPriceImport],
    clear_existing: bool = Query(default=False, description="Clear existing records first"),
    _: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Bulk import raw_prices records (for data migration). Admin only —
    clear_existing wipes the whole raw_prices table.
    """
    logger.info(f"Importing {len(records)} raw_price records (clear={clear_existing})")
    
    if clear_existing:
        await db.execute(text("DELETE FROM raw_prices"))
        await db.commit()
        logger.info("Cleared existing raw_prices")
    
    from app.models.raw_price import RawPrice
    from datetime import datetime
    
    # Use ORM bulk insert for safety
    for i in range(0, len(records), 500):
        batch = records[i:i+500]
        for r in batch:
            scraped = datetime.fromisoformat(r.scraped_at) if r.scraped_at else datetime.utcnow()
            obj = RawPrice(
                card_name=r.card_name,
                card_set=r.card_set,
                card_number=r.card_number,
                condition=r.condition,
                language=r.language or "EN",
                price=r.price,
                currency=r.currency or "EUR",
                source=r.source,
                source_url=r.source_url,
                seller_name=r.seller_name,
                seller_rating=r.seller_rating,
                stock_quantity=r.stock_quantity,
                scraped_at=scraped,
            )
            db.add(obj)
        await db.commit()
        logger.info(f"  Inserted batch {i//500 + 1} ({min(i+500, len(records))}/{len(records)})")
    
    result = await db.execute(text("SELECT COUNT(*) FROM raw_prices"))
    total = result.scalar()
    
    return {"imported": len(records), "total_in_db": total}


@router.get("/import/status")
async def import_status(
    _: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Check current raw_prices count (admin only)"""
    result = await db.execute(text("SELECT COUNT(*) FROM raw_prices"))
    total = result.scalar()
    result2 = await db.execute(text("SELECT COUNT(DISTINCT card_name) FROM raw_prices"))
    unique = result2.scalar()
    return {"total_records": total, "unique_cards": unique}


# ═══════════════════════════════════════════════════════════════
# Price History — daily avg/min/max from raw_prices per card
# ═══════════════════════════════════════════════════════════════

class PriceHistoryPoint(BaseModel):
    date: str
    avg_price: float
    min_price: float
    max_price: float
    listing_count: int


class ConditionBreakdown(BaseModel):
    condition: str
    count: int
    avg_price: float


class PriceHistoryResponse(BaseModel):
    card_name: str
    history: List[PriceHistoryPoint]
    conditions: List[ConditionBreakdown]


# Same normalization as the analysis service's daily_prices.name_key
_NAME_KEY_SQL = "lower(regexp_replace(btrim({col}), '\\s+', ' ', 'g'))"


def _pick_product(rows) -> List:
    """
    Rows of several products (variants) for one requested name: keep the one
    with the most observed days, so the chart never mixes a regular card with
    its special illustration rare.
    """
    by_product: Dict[tuple, List] = {}
    for r in rows:
        by_product.setdefault((r.set_key, r.category, r.card_key), []).append(r)
    if not by_product:
        return []
    return max(by_product.values(), key=lambda pts: (len(pts), sum(p.listings for p in pts)))


@router.get("/price_history", response_model=PriceHistoryResponse)
async def get_price_history(
    card_name: str = Query(..., description="Exact card name to look up"),
    days: int = Query(default=30, ge=7, le=180, description="Number of days of history"),
    product_set: Optional[str] = Query(default=None, max_length=255),
    card_number: Optional[str] = Query(default=None, max_length=100, description="Variant (CardTrader blueprint id)"),
    current_user: User = Depends(get_current_premium_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Daily price history of one product from daily_prices (written by the
    analysis service; comparable listings only: singles near-mint in the
    analysed languages, EUR). avg_price is the daily median listing price,
    min_price the cheapest listing that day. Plus/Business only.

    Also returns a condition breakdown of the current listings (raw_prices,
    last few days) for context.
    """
    since_day = datetime.now(timezone.utc).date() - timedelta(days=days)
    params = {"name": card_name, "since_day": since_day,
              "set": product_set or "", "card": card_number or ""}
    name_key = _NAME_KEY_SQL.format(col="CAST(:name AS text)")
    history_result = await db.execute(
        text(f"""
            SELECT set_key, category, card_key, day,
                   median_price, min_price, max_price, listings
            FROM daily_prices
            WHERE name_key = {name_key}
              AND day > :since_day
              AND (CAST(:card AS text) = '' OR card_key = CAST(:card AS text))
              AND (CAST(:set AS text) = '' OR set_key = lower(btrim(CAST(:set AS text))))
            ORDER BY day ASC
        """),
        params,
    )
    rows = _pick_product(history_result.fetchall())

    variant_filter = "AND card_number = CAST(:card AS text)" if card_number else ""
    cond_result = await db.execute(
        text(f"""
            SELECT
                COALESCE(condition, 'Unknown') AS condition,
                COUNT(*)                       AS count,
                ROUND(AVG(price)::numeric, 2)  AS avg_price
            FROM raw_prices
            WHERE LOWER(card_name) = LOWER(:name)
              AND price > 0
              {variant_filter}
            GROUP BY condition
            ORDER BY count DESC
            LIMIT 6
        """),
        params,
    )
    cond_rows = cond_result.fetchall()

    return PriceHistoryResponse(
        card_name=card_name,
        history=[
            PriceHistoryPoint(
                date=str(r.day),
                avg_price=float(r.median_price),
                min_price=float(r.min_price),
                max_price=float(r.max_price),
                listing_count=int(r.listings),
            )
            for r in rows
        ],
        conditions=[
            ConditionBreakdown(
                condition=c.condition,
                count=int(c.count),
                avg_price=float(c.avg_price),
            )
            for c in cond_rows
        ],
    )


# ═══════════════════════════════════════════════════════════════
# Public endpoints — no auth required (landing page previews)
# ═══════════════════════════════════════════════════════════════

@router.get("/public/top_deals", response_model=List[DealScoreResponse])
async def get_public_top_deals(
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint: top 5 deals for the landing page preview.
    No authentication required. Returns real live data.
    """
    cached = public_cache.get("top_deals")
    if cached is not None:
        return cached

    from app.models.deal_score import DealScore as DealScoreModel
    result = await db.execute(
        select(DealScoreModel)
        .where(
            DealScoreModel.is_active == True,  # noqa: E712
            DealScoreModel.deal_score >= 70,
        )
        .order_by(desc(DealScoreModel.deal_score))
        .limit(5)
    )
    deals = result.scalars().all()
    response = [DealScoreResponse.model_validate(d) for d in deals]
    public_cache.set("top_deals", response)
    return response


# ═══════════════════════════════════════════════════════════════
# Price sparklines — batch endpoint for inline trend charts
# ═══════════════════════════════════════════════════════════════

@router.get("/price_sparklines")
async def get_price_sparklines(
    card_names: List[str] = Query(..., description="Card names to fetch sparkline data for"),
    card_numbers: Optional[List[str]] = Query(
        default=None,
        description="Variant per card name (same order; '' when unknown). Keys the result as 'name#card_number'.",
    ),
    days: int = Query(default=7, ge=3, le=30, description="Number of days of history"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Batch endpoint: daily median listing price per product for the past N days
    (from daily_prices), for the sparklines on deal cards.

    Returns {key: [price, ...]} oldest first, where key is the card name, or
    'name#card_number' when a variant was given for it. A name without a
    variant uses its most observed product.
    """
    if not card_names:
        return {}

    # Limit to 200 cards per request to avoid abuse
    card_names = card_names[:200]
    numbers = list(card_numbers or [])[:len(card_names)]
    numbers += [""] * (len(card_names) - len(numbers))
    keys = [f"{n}#{c}" if c else n for n, c in zip(card_names, numbers)]

    since_day = datetime.now(timezone.utc).date() - timedelta(days=days)
    name_key = _NAME_KEY_SQL.format(col="r.name")
    result = await db.execute(
        text(f"""
            WITH req AS (
                SELECT {name_key} AS name_key, r.card, r.k
                FROM unnest(CAST(:names AS text[]), CAST(:cards AS text[]), CAST(:keys AS text[]))
                     AS r(name, card, k)
            )
            SELECT req.k, d.set_key, d.category, d.card_key, d.day, d.median_price, d.listings
            FROM req
            JOIN daily_prices d
              ON d.name_key = req.name_key
             AND (req.card = '' OR d.card_key = req.card)
            WHERE d.day > :since_day
            ORDER BY req.k, d.day
        """),
        {"names": card_names, "cards": numbers, "keys": keys, "since_day": since_day},
    )

    grouped: Dict[str, List] = {}
    for row in result.fetchall():
        grouped.setdefault(row.k, []).append(row)

    return {
        key: [float(p.median_price) for p in _pick_product(rows)]
        for key, rows in grouped.items()
    }
