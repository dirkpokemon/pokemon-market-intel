"""
Deal Score Calculator
Implements the weighted deal scoring formula (see scoring.deal_score):

Deal Score = (Price vs usual floor × 0.4) +
             (Supply trend × 0.3) +
             (Liquidity × 0.2) +
             (Set popularity × 0.1)
"""

import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy import delete, insert, select

from app.calculators.scoring import deal_score
from app.config_analysis import analysis_config
from app.database import AsyncSessionLocal
from app.models.deal_score import DealScore
from app.models.market_stats import MarketStats

logger = logging.getLogger(__name__)


def _dec(value: Optional[float]) -> Optional[Decimal]:
    return None if value is None else Decimal(str(round(value, 2)))


class DealScoreCalculator:
    """
    Calculates deal scores for every product in the latest market_statistics.
    """

    def __init__(self):
        self.config = analysis_config

    async def calculate_all(self) -> int:
        """
        Calculate deal scores and replace the deal_scores table contents in one
        transaction (no window without active deals, no unbounded growth of
        inactive history rows).

        Returns:
            Number of deal scores saved
        """
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=48)

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(MarketStats).where(MarketStats.calculated_at >= cutoff)
            )
            market_stats = result.scalars().all()

        if not market_stats:
            logger.warning("No market stats found")
            return 0

        logger.info(f"Calculating deal scores for {len(market_stats)} products")

        records = []
        for stats in market_stats:
            try:
                record = self._calculate_deal_score(stats, now)
                if record:
                    records.append(record)
            except Exception as e:
                logger.error(f"Error calculating deal score for {stats.product_name}: {e}")

        if not records:
            logger.warning("No deal scores computed; leaving existing deal_scores unchanged")
            return 0

        async with AsyncSessionLocal() as session:
            async with session.begin():
                await session.execute(delete(DealScore))
                for i in range(0, len(records), 1000):
                    await session.execute(insert(DealScore), records[i:i + 1000])

        logger.info(f"Replaced deal_scores with {len(records)} rows")
        return len(records)

    def _calculate_deal_score(self, stats: MarketStats, now: datetime) -> Optional[Dict[str, Any]]:
        scores = deal_score(
            product_set=stats.product_set,
            current_price=float(stats.current_price) if stats.current_price is not None else None,
            floor_price_30d=float(stats.floor_price_30d) if stats.floor_price_30d is not None else None,
            volume_trend_7d=float(stats.volume_trend_7d or 0),
            liquidity=float(stats.liquidity_score or 0),
            days_observed=int(stats.days_observed or 0),
            data_quality_label=stats.data_quality or "insufficient",
            last_seen_at=stats.last_seen_at,
            now=now,
            cfg=self.config,
        )
        if scores is None:
            return None

        return {
            "product_name": stats.product_name,
            "product_set": stats.product_set,
            "category": stats.category,
            "current_price": _dec(float(stats.current_price)),
            "currency": "EUR",
            # Singles are scored on comparable (near mint) listings only
            "condition": "NM" if stats.category == "single" else None,
            "source": "Aggregated",
            # Typical listing price (median) for display; floor = usual cheapest listing
            "market_avg_price": stats.avg_price_30d,
            "market_min_price": stats.floor_price_30d,
            **{k: _dec(v) for k, v in scores.items()},
            "data_quality": stats.data_quality,
            "is_active": True,
            "expires_at": now + timedelta(hours=24),
            "calculated_at": now,
        }
