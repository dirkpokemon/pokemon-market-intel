"""
Market Data API endpoints
Provides access to signals, deal scores, market statistics, full catalog search, and news
"""

import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func, text
from pydantic import BaseModel
import httpx

from app.database import get_db
from app.models.user import User
from app.schemas.market import (
    SignalResponse, DealScoreResponse, MarketStatsResponse,
    CardSearchResult, SearchResponse,
    MarketDigestResponse, SetTrend, SignalSummary,
)
from app.core.dependencies import get_current_user, get_current_premium_user
from app.data.set_registry import SETS, ERAS as SET_ERAS, aliases_for
from app.utils.cache import public_cache, dashboard_cache


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


@router.get("/signals", response_model=List[SignalResponse])
async def get_signals(
    limit: int = Query(default=50, le=100, description="Maximum number of signals to return"),
    signal_type: Optional[str] = Query(default=None, description="Filter by signal type"),
    signal_level: Optional[str] = Query(default=None, description="Filter by signal level"),
    product_set: Optional[str] = Query(default=None, description="Filter by product set"),
    current_user: User = Depends(get_current_premium_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get latest market signals (PREMIUM ONLY)
    
    **Requires:** Paid or Pro subscription
    
    Returns active signals sorted by priority and detection time
    
    - **limit**: Maximum number of signals (default: 50, max: 100)
    - **signal_type**: Filter by type (high_deal, medium_deal, undervalued, momentum, risk, arbitrage)
    - **signal_level**: Filter by level (high, medium, low)
    - **product_set**: Filter by card set name
    """
    logger.info(f"User {current_user.email} fetching signals")
    
    # Import Signal model
    from app.models.signal import Signal
    
    # Build query
    query = select(Signal).where(Signal.is_active == True)
    
    if signal_type:
        query = query.where(Signal.signal_type == signal_type)
    
    if signal_level:
        query = query.where(Signal.signal_level == signal_level)
    
    if product_set:
        query = query.where(Signal.product_set == product_set)
    
    # Order by detection time so high/medium/low signals are mixed in the feed
    query = query.order_by(desc(Signal.detected_at), desc(Signal.priority)).limit(limit)
    
    result = await db.execute(query)
    signals = result.scalars().all()
    
    logger.info(f"Returning {len(signals)} signals")
    
    return [SignalResponse.from_orm(signal) for signal in signals]


def _approx_distinct_from_pg_stats(n_distinct_raw, n_live: int) -> int:
    """
    Turn pg_stats.n_distinct into an approximate count (PostgreSQL planner stats).
    Positive = estimated distinct count; negative = -fraction * row estimate.
    """
    if n_live <= 0 or n_distinct_raw is None:
        return 0
    try:
        nd = float(n_distinct_raw)
    except (TypeError, ValueError):
        return 0
    if nd >= 0:
        return int(nd)
    return max(1, min(n_live, int(round(abs(nd) * n_live))))


async def _raw_prices_digest_row(db: AsyncSession):
    """
    Fast raw_prices stats: catalog stats + MAX(scraped_at) only.
    Avoids multiple full-table COUNT(*) / COUNT(DISTINCT) on large tables.
    """
    row = (
        await db.execute(
            text(
                """
        SELECT
          COALESCE(
            (SELECT n_live_tup::bigint FROM pg_stat_user_tables
             WHERE schemaname = 'public' AND relname = 'raw_prices'),
            0
          ) AS n_live,
          (SELECT MAX(scraped_at) FROM raw_prices) AS last_scrape,
          (SELECT n_distinct FROM pg_stats
             WHERE schemaname = 'public' AND tablename = 'raw_prices' AND attname = 'card_name'
             LIMIT 1) AS nd_cards,
          (SELECT n_distinct FROM pg_stats
             WHERE schemaname = 'public' AND tablename = 'raw_prices' AND attname = 'card_set'
             LIMIT 1) AS nd_sets
        """
            )
        )
    ).one()

    n_live = int(row.n_live or 0)
    last_scrape = row.last_scrape
    cards = _approx_distinct_from_pg_stats(row.nd_cards, n_live)
    sets = _approx_distinct_from_pg_stats(row.nd_sets, n_live)
    # Sets with NULL card_set are not distinct "sets"; cap for display sanity
    sets = min(sets, n_live) if n_live else 0
    return n_live, cards, sets, last_scrape


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
    db: AsyncSession = Depends(get_db),
):
    """
    Returns distinct product_set values in market_stats that don't match
    any alias in the set registry. Use to discover newly scraped sets that
    need to be added to set_registry.py.
    No auth required — maintenance endpoint.
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get market statistics for products
    
    **Available to all users**
    
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


# ─── Market Digest (Price Signals command center) ─────────────────

@router.get("/market_digest", response_model=MarketDigestResponse)
async def get_market_digest(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Aggregated market overview: signal counts, set trends, highlights.
    Powers the Price Signals page.
    """
    cached = dashboard_cache.get("market_digest")
    if cached is not None:
        return cached

    from app.models.signal import Signal
    from app.models.market_stats import MarketStats

    # Overview counts: use planner stats + MAX(scraped_at) — full COUNT(*) on raw_prices is too slow at scale
    total_listings, total_cards, total_sets, last_scrape_at = await _raw_prices_digest_row(db)

    last_analysis = await db.execute(
        select(func.max(MarketStats.calculated_at))
    )
    last_at = last_analysis.scalar()

    # Signal counts by type
    sig_counts_q = await db.execute(
        select(Signal.signal_type, func.count(Signal.id))
        .where(Signal.is_active == True)
        .group_by(Signal.signal_type)
    )
    signal_counts = {row[0]: row[1] for row in sig_counts_q.all()}

    # Top 5 highest-priority active signals as highlights
    highlights_q = await db.execute(
        select(Signal)
        .where(Signal.is_active == True)
        .order_by(desc(Signal.priority), desc(Signal.detected_at))
        .limit(5)
    )
    highlights = [SignalResponse.from_orm(s) for s in highlights_q.scalars().all()]

    # Set trends (aggregated from market_statistics)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    set_trends_q = await db.execute(
        select(
            MarketStats.product_set,
            func.avg(MarketStats.price_trend_7d).label("avg_trend"),
            func.avg(MarketStats.volume_trend_7d).label("avg_vol_trend"),
            func.count(MarketStats.id).label("card_count"),
            func.avg(MarketStats.avg_price_7d).label("avg_price"),
        )
        .where(and_(
            MarketStats.calculated_at >= cutoff,
            MarketStats.product_set.isnot(None),
        ))
        .group_by(MarketStats.product_set)
        .having(func.count(MarketStats.id) >= 3)
    )
    all_set_trends = set_trends_q.all()

    rising = sorted(all_set_trends, key=lambda r: float(r.avg_trend or 0), reverse=True)[:5]
    declining = sorted(all_set_trends, key=lambda r: float(r.avg_trend or 0))[:5]

    def to_set_trend(row) -> SetTrend:
        return SetTrend(
            product_set=row.product_set,
            avg_trend=round(float(row.avg_trend or 0), 2),
            avg_volume_trend=round(float(row.avg_vol_trend or 0), 2),
            card_count=row.card_count,
            avg_price=round(float(row.avg_price or 0), 2),
        )

    result = MarketDigestResponse(
        total_cards_tracked=total_cards,
        total_sets=total_sets,
        total_listings=total_listings,
        last_analysis_at=last_at,
        last_scrape_at=last_scrape_at,
        signal_counts=signal_counts,
        signal_highlights=highlights,
        top_rising_sets=[to_set_trend(r) for r in rising],
        top_declining_sets=[to_set_trend(r) for r in declining if float(r.avg_trend or 0) < 0],
    )
    dashboard_cache.set("market_digest", result)
    return result


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
    
    search_term = f"%{q.lower()}%"
    
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
        WHERE LOWER(card_name) LIKE :search_term
           OR LOWER(card_set) LIKE :search_term
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
        WHERE LOWER(card_name) LIKE :search_term
           OR LOWER(card_set) LIKE :search_term
    """)
    count_result = await db.execute(count_query, {"search_term": search_term})
    total_count = count_result.scalar() or 0
    
    # Enrich results with deal scores if available
    card_names = [row.card_name for row in rows]
    deal_score_map = {}
    if card_names:
        deal_query = select(DealScore).where(
            and_(
                DealScore.product_name.in_(card_names),
                DealScore.is_active == True
            )
        )
        deal_result = await db.execute(deal_query)
        for ds in deal_result.scalars().all():
            deal_score_map[ds.product_name] = ds
    
    # Build response
    results = []
    for row in rows:
        ds = deal_score_map.get(row.card_name)
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
    db: AsyncSession = Depends(get_db)
):
    """
    Bulk import raw_prices records (for data migration)
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
async def import_status(db: AsyncSession = Depends(get_db)):
    """Check current raw_prices count"""
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


@router.get("/price_history", response_model=PriceHistoryResponse)
async def get_price_history(
    card_name: str = Query(..., description="Exact card name to look up"),
    days: int = Query(default=30, ge=7, le=90, description="Number of days of history"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns daily average, min, and max prices for a specific card over the past N days,
    derived from the raw_prices append-only table (real scraped data, not simulated).
    Also returns a condition breakdown (NM / LP / HP etc.) for context.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Fuzzy match: exact first, fall back to ILIKE if no results
    exact_check = await db.execute(
        text("SELECT 1 FROM raw_prices WHERE LOWER(card_name) = LOWER(:name) LIMIT 1"),
        {"name": card_name},
    )
    use_exact = exact_check.fetchone() is not None
    name_filter = "LOWER(card_name) = LOWER(:name)" if use_exact else "LOWER(card_name) LIKE LOWER(:name)"
    fuzzy_name = card_name if use_exact else f"%{card_name}%"

    history_result = await db.execute(
        text(f"""
            SELECT
                DATE(scraped_at AT TIME ZONE 'UTC') AS day,
                ROUND(AVG(price)::numeric, 2)        AS avg_price,
                ROUND(MIN(price)::numeric, 2)        AS min_price,
                ROUND(MAX(price)::numeric, 2)        AS max_price,
                COUNT(*)                             AS listing_count
            FROM raw_prices
            WHERE {name_filter}
              AND scraped_at >= :cutoff
              AND price > 0
            GROUP BY day
            ORDER BY day ASC
        """),
        {"name": fuzzy_name, "cutoff": cutoff},
    )
    rows = history_result.fetchall()

    cond_result = await db.execute(
        text(f"""
            SELECT
                COALESCE(condition, 'Unknown') AS condition,
                COUNT(*)                       AS count,
                ROUND(AVG(price)::numeric, 2)  AS avg_price
            FROM raw_prices
            WHERE {name_filter}
              AND price > 0
            GROUP BY condition
            ORDER BY count DESC
            LIMIT 6
        """),
        {"name": fuzzy_name},
    )
    cond_rows = cond_result.fetchall()

    return PriceHistoryResponse(
        card_name=card_name,
        history=[
            PriceHistoryPoint(
                date=str(r.day),
                avg_price=float(r.avg_price),
                min_price=float(r.min_price),
                max_price=float(r.max_price),
                listing_count=int(r.listing_count),
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
    days: int = Query(default=7, ge=3, le=30, description="Number of days of history"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Batch endpoint: returns daily avg price per card for the past N days.
    Used for sparkline charts on deal cards. Returns a dict of {card_name: [avg_price, ...]}.
    """
    if not card_names:
        return {}

    # Limit to 200 cards per request to avoid abuse
    card_names = card_names[:200]

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    lower_names = [n.lower() for n in card_names]

    result = await db.execute(
        text("""
            SELECT
                LOWER(card_name) AS card_key,
                DATE(scraped_at AT TIME ZONE 'UTC') AS day,
                ROUND(AVG(price)::numeric, 2) AS avg_price
            FROM raw_prices
            WHERE LOWER(card_name) = ANY(:names)
              AND scraped_at >= :cutoff
              AND price > 0
            GROUP BY LOWER(card_name), day
            ORDER BY LOWER(card_name), day ASC
        """),
        {"names": lower_names, "cutoff": cutoff},
    )
    rows = result.fetchall()

    # Build lookup: lowercase card_name → list of daily avg prices
    grouped: Dict[str, List[float]] = {}
    for row in rows:
        key = row.card_key
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(float(row.avg_price))

    # Return keyed by original card_name (match on lowercase)
    output: Dict[str, List[float]] = {}
    for name in card_names:
        key = name.lower()
        if key in grouped:
            output[name] = grouped[key]

    return output


# ═══════════════════════════════════════════════════════════════
# TCG news — fetches from real RSS feeds, cached in memory
# ═══════════════════════════════════════════════════════════════

# In-memory news cache: { "articles": [...], "fetched_at": datetime }
_news_cache: dict = {"articles": [], "fetched_at": None}
NEWS_CACHE_MINUTES = 60  # Refresh every hour

# RSS feed sources (tried in order — only reliable ones that return valid XML)
NEWS_FEEDS = [
    ("https://www.dexerto.com/pokemon/feed/", "Dexerto"),
    ("https://pokemonblog.com/feed/", "PokémonBlog"),
]


class NewsArticle(BaseModel):
    title: str
    link: str
    source: str
    published: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None


def _parse_rss(xml_text: str, source_name: str, limit: int = 20) -> List[dict]:
    """Parse RSS XML and return list of article dicts"""
    import re
    articles = []
    try:
        # Clean XML of invalid characters
        xml_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', xml_text)
        root = ET.fromstring(xml_text)
        # Standard RSS 2.0 structure
        channel = root.find("channel")
        if channel is None:
            return articles
        for item in channel.findall("item")[:limit]:
            title = item.findtext("title", "").strip()
            link = item.findtext("link", "").strip()
            pub_date = item.findtext("pubDate", "").strip()
            description = item.findtext("description", "").strip()

            # Try to extract image from multiple sources
            image_url = None
            # 1. Check media:content or media:thumbnail (Yahoo Media RSS namespace)
            media_ns = "{http://search.yahoo.com/mrss/}"
            for tag in [f"{media_ns}content", f"{media_ns}thumbnail"]:
                media_el = item.find(tag)
                if media_el is not None:
                    image_url = media_el.get("url")
                    if image_url:
                        break
            # 2. Check <enclosure> tag (common for podcast/blog RSS)
            if not image_url:
                enclosure = item.find("enclosure")
                if enclosure is not None and "image" in (enclosure.get("type", "")):
                    image_url = enclosure.get("url")
            # 3. Try to find image URL in description HTML
            if not image_url and description:
                img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', description)
                if img_match:
                    image_url = img_match.group(1)
            # 4. Check content:encoded for image
            if not image_url:
                content_ns = "{http://purl.org/rss/1.0/modules/content/}"
                content = item.findtext(f"{content_ns}encoded", "")
                if content:
                    img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', content)
                    if img_match:
                        image_url = img_match.group(1)

            # Clean description (remove HTML tags)
            if description:
                description = re.sub(r'<[^>]+>', '', description).strip()
                description = re.sub(r'\s+', ' ', description).strip()
                if len(description) > 200:
                    description = description[:200].rsplit(' ', 1)[0] + '...'

            if title and link:
                articles.append({
                    "title": title,
                    "link": link,
                    "source": source_name,
                    "published": pub_date,
                    "description": description or None,
                    "image_url": image_url,
                })
    except Exception as e:
        logger.warning(f"Failed to parse RSS from {source_name}: {e}")
    return articles


async def _fetch_news(limit: int = 15) -> List[dict]:
    """Fetch news from RSS feeds"""
    global _news_cache

    # Return cached if fresh
    if _news_cache["fetched_at"] and (
        datetime.utcnow() - _news_cache["fetched_at"] < timedelta(minutes=NEWS_CACHE_MINUTES)
    ):
        return _news_cache["articles"][:limit]

    all_articles = []
    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        for feed_url, source_name in NEWS_FEEDS:
            try:
                resp = await client.get(feed_url, headers={
                    "User-Agent": "TCGPulse/1.0 (News Aggregator)"
                })
                if resp.status_code == 200:
                    articles = _parse_rss(resp.text, source_name, limit=15)
                    all_articles.extend(articles)
                    logger.info(f"Fetched {len(articles)} articles from {source_name}")
            except Exception as e:
                logger.warning(f"Failed to fetch {source_name}: {e}")

    # Sort by published date (newest first) if possible
    # pubDate format: "Thu, 20 Mar 2026 12:00:00 +0000"
    def parse_pub_date(article):
        try:
            from email.utils import parsedate_to_datetime
            return parsedate_to_datetime(article.get("published", ""))
        except:
            return datetime.min

    all_articles.sort(key=parse_pub_date, reverse=True)

    # Update cache
    _news_cache = {
        "articles": all_articles,
        "fetched_at": datetime.utcnow(),
    }

    return all_articles[:limit]


@router.get("/news", response_model=List[NewsArticle])
async def get_pokemon_news(
    limit: int = Query(default=10, le=20, description="Number of articles to return"),
    current_user: User = Depends(get_current_user),
):
    """
    Get latest TCG news from trusted sources.
    Results are cached for 1 hour.
    """
    articles = await _fetch_news(limit=limit)
    logger.info(f"Returning {len(articles)} news articles for user {current_user.email}")
    return articles
