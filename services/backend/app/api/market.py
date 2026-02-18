"""
Market Data API endpoints
Provides access to signals, deal scores, and market statistics
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.database import get_db
from app.models.user import User
from app.schemas.market import SignalResponse, DealScoreResponse, MarketStatsResponse
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
