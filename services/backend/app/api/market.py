"""
Market Data API endpoints
Provides access to signals, deal scores, market statistics, and full catalog search
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func, text
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.schemas.market import (
    SignalResponse, DealScoreResponse, MarketStatsResponse,
    CardSearchResult, SearchResponse
)
from app.core.dependencies import get_current_user, get_current_premium_user


logger = logging.getLogger(__name__)
router = APIRouter(tags=["Market Data"])


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
    - **product_set**: Filter by Pokémon set name
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
    
    # Order by priority (desc) and detection time (desc)
    query = query.order_by(desc(Signal.priority), desc(Signal.detected_at)).limit(limit)
    
    result = await db.execute(query)
    signals = result.scalars().all()
    
    logger.info(f"Returning {len(signals)} signals")
    
    return [SignalResponse.from_orm(signal) for signal in signals]


@router.get("/deal_scores", response_model=List[DealScoreResponse])
async def get_deal_scores(
    limit: int = Query(default=50, le=100, description="Maximum number of deal scores to return"),
    min_score: float = Query(default=0, ge=0, le=100, description="Minimum deal score"),
    category: Optional[str] = Query(default=None, description="Filter by category (single/sealed)"),
    product_set: Optional[str] = Query(default=None, description="Filter by product set"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get deal scores for products
    
    **Free tier:** Limited to top 10 deals (score ≥ 70)
    **Premium tier:** Full access to all deals
    
    Returns active deal scores sorted by score (highest first)
    
    - **limit**: Maximum number of scores (default: 50, max: 100)
    - **min_score**: Minimum deal score filter (0-100)
    - **category**: Filter by category (single or sealed)
    - **product_set**: Filter by Pokémon set name
    """
    logger.info(f"User {current_user.email} fetching deal scores")
    
    # Import DealScore model
    from app.models.deal_score import DealScore
    
    # Apply free tier limits
    if not current_user.is_premium():
        min_score = max(min_score, 70)  # Free users only see deals ≥ 70
        limit = min(limit, 10)  # Free users limited to 10 results
    
    # Build query
    query = select(DealScore).where(
        and_(
            DealScore.is_active == True,
            DealScore.deal_score >= min_score
        )
    )
    
    if category:
        query = query.where(DealScore.category == category)
    
    if product_set:
        query = query.where(DealScore.product_set == product_set)
    
    # Order by deal score (desc)
    query = query.order_by(desc(DealScore.deal_score)).limit(limit)
    
    result = await db.execute(query)
    deal_scores = result.scalars().all()
    
    logger.info(f"Returning {len(deal_scores)} deal scores (min_score: {min_score})")
    
    return [DealScoreResponse.from_orm(score) for score in deal_scores]


@router.get("/market_stats", response_model=List[MarketStatsResponse])
async def get_market_stats(
    limit: int = Query(default=50, le=100, description="Maximum number of stats to return"),
    product_set: Optional[str] = Query(default=None, description="Filter by product set"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get market statistics for products
    
    **Available to all users**
    
    Returns market statistics sorted by calculation time (most recent first)
    
    - **limit**: Maximum number of stats (default: 50, max: 100)
    - **product_set**: Filter by Pokémon set name
    """
    logger.info(f"User {current_user.email} fetching market stats")
    
    # Import MarketStats model
    from app.models.market_stats import MarketStats
    
    # Build query
    query = select(MarketStats)
    
    if product_set:
        query = query.where(MarketStats.product_set == product_set)
    
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
