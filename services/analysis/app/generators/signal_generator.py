"""
Signal Generation Engine
Detects meaningful market signals: momentum, risk, price drops,
supply changes, volatility spikes, and set-level trends.

Does NOT generate deal-based signals (those belong in Top Deals).
"""

import logging
from typing import List
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import json

from sqlalchemy import select, and_, func

from app.config_analysis import analysis_config
from app.database import AsyncSessionLocal
from app.models.signal import Signal
from app.models.deal_score import DealScore
from app.models.market_stats import MarketStats

logger = logging.getLogger(__name__)


class SignalGenerator:
    """
    Generates market intelligence signals focused on *change detection*.
    """
    
    def __init__(self):
        self.config = analysis_config
        logger.info("SignalGenerator initialized")
    
    async def generate_all(self) -> int:
        """
        Run the full signal generation pipeline.
        """
        logger.info("Starting signal generation")
        
        signals: List[Signal] = []
        
        signals.extend(await self._generate_momentum_signals())
        signals.extend(await self._generate_sustained_uptrend_signals())
        signals.extend(await self._generate_consecutive_rising_signals())
        signals.extend(await self._generate_risk_signals())
        signals.extend(await self._generate_price_drop_signals())
        signals.extend(await self._generate_supply_signals())
        signals.extend(await self._generate_volatility_signals())
        signals.extend(await self._generate_set_trend_signals())

        if not signals:
            signals.extend(await self._generate_market_mover_fallback())
        
        if not signals:
            logger.info("No signals matched criteria; keeping existing active signals unchanged")
            return 0
        
        await self._deactivate_expired_signals()
        
        async with AsyncSessionLocal() as session:
            session.add_all(signals)
            await session.commit()
            logger.info(f"Generated {len(signals)} signals total")
        
        return len(signals)
    
    async def _deactivate_expired_signals(self):
        """Deactivate all previous signals before generating a fresh set."""
        async with AsyncSessionLocal() as session:
            from sqlalchemy import update
            stmt = (
                update(Signal)
                .where(Signal.is_active == True)
                .values(is_active=False)
            )
            result = await session.execute(stmt)
            await session.commit()
            logger.info(f"Deactivated {result.rowcount} old signals")
    
    MIN_SIGNAL_PRICE = 2.0  # Skip cards below this price to reduce noise
    
    # ─── Momentum: price AND volume both rising ─────────────────
    
    async def _generate_momentum_signals(self) -> List[Signal]:
        signals = []
        
        async with AsyncSessionLocal() as session:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
            result = await session.execute(
                select(MarketStats).where(MarketStats.calculated_at >= cutoff)
            )
            stats_list = result.scalars().all()
            
            for stats in stats_list:
                if float(stats.avg_price_7d or 0) < self.MIN_SIGNAL_PRICE:
                    continue
                price_trend = float(stats.price_trend_7d or 0)
                volume_trend = float(stats.volume_trend_7d or 0)

                if (price_trend >= self.config.MOMENTUM_PRICE_CHANGE and
                    volume_trend >= self.config.MOMENTUM_VOLUME_CHANGE):

                    if price_trend >= 40:
                        level = 'high'
                        confidence = min(95, 70 + price_trend / 10)
                    elif price_trend >= 20:
                        level = 'medium'
                        confidence = 65 + price_trend / 5
                    else:
                        level = 'low'
                        confidence = 55 + price_trend

                    signals.append(self._create_signal(
                        signal_type='momentum',
                        signal_level=level,
                        product_name=stats.product_name,
                        product_set=stats.product_set,
                        category=stats.category,
                        current_price=stats.avg_price_7d,
                        market_avg_price=stats.avg_price_30d,
                        description=f"{stats.product_name}: price +{price_trend:.1f}% and volume +{volume_trend:.1f}% in 7 days",
                        metadata={'price_trend': round(price_trend, 2), 'volume_trend': round(volume_trend, 2)},
                        priority=7,
                        confidence=round(min(95, confidence), 1),
                    ))
        
        logger.info(f"Generated {len(signals)} momentum signals")
        return signals
    
    # ─── Risk: volume dropping but price rising ─────────────────
    
    async def _generate_risk_signals(self) -> List[Signal]:
        signals = []
        
        async with AsyncSessionLocal() as session:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
            result = await session.execute(
                select(MarketStats).where(MarketStats.calculated_at >= cutoff)
            )
            stats_list = result.scalars().all()
            
            for stats in stats_list:
                if float(stats.avg_price_7d or 0) < self.MIN_SIGNAL_PRICE:
                    continue
                price_trend = float(stats.price_trend_7d or 0)
                volume_trend = float(stats.volume_trend_7d or 0)
                
                if (volume_trend <= self.config.RISK_VOLUME_DROP and
                    price_trend >= self.config.RISK_PRICE_RISE):

                    # High only if both extremes are severe
                    level = 'high' if (volume_trend <= -40 and price_trend >= 25) else 'medium'
                    confidence = 75 if level == 'high' else 60

                    signals.append(self._create_signal(
                        signal_type='risk',
                        signal_level=level,
                        product_name=stats.product_name,
                        product_set=stats.product_set,
                        category=stats.category,
                        current_price=stats.avg_price_7d,
                        market_avg_price=stats.avg_price_30d,
                        description=f"Risk: {stats.product_name} price +{price_trend:.1f}% but volume {volume_trend:.1f}% — possible bubble",
                        metadata={'price_trend': round(price_trend, 2), 'volume_trend': round(volume_trend, 2)},
                        priority=9,
                        confidence=confidence,
                    ))
        
        logger.info(f"Generated {len(signals)} risk signals")
        return signals
    
    # ─── Price Drop: significant price decrease ─────────────────
    
    async def _generate_price_drop_signals(self) -> List[Signal]:
        signals = []
        
        async with AsyncSessionLocal() as session:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
            result = await session.execute(
                select(MarketStats).where(MarketStats.calculated_at >= cutoff)
            )
            stats_list = result.scalars().all()
            
            for stats in stats_list:
                price_trend = float(stats.price_trend_7d or 0)
                avg_price = float(stats.avg_price_30d or 0)
                
                if price_trend <= self.config.PRICE_DROP_THRESHOLD and avg_price > 1.0:
                    if price_trend <= -35:
                        level = 'high'
                        confidence = min(90, 70 + abs(price_trend) / 5)
                    elif price_trend <= -20:
                        level = 'medium'
                        confidence = 60 + abs(price_trend) / 5
                    else:
                        level = 'low'
                        confidence = 50 + abs(price_trend)

                    signals.append(self._create_signal(
                        signal_type='price_drop',
                        signal_level=level,
                        product_name=stats.product_name,
                        product_set=stats.product_set,
                        category=stats.category,
                        current_price=stats.avg_price_7d,
                        market_avg_price=stats.avg_price_30d,
                        description=f"{stats.product_name} dropped {price_trend:.1f}% in 7 days (avg was €{avg_price:.2f})",
                        metadata={'price_trend': round(price_trend, 2), 'avg_price_30d': round(avg_price, 2)},
                        priority=8,
                        confidence=round(min(90, confidence), 1),
                    ))
        
        logger.info(f"Generated {len(signals)} price drop signals")
        return signals
    
    # ─── Supply Change: listing volume shifts ───────────────────
    
    async def _generate_supply_signals(self) -> List[Signal]:
        signals = []
        
        async with AsyncSessionLocal() as session:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
            result = await session.execute(
                select(MarketStats).where(MarketStats.calculated_at >= cutoff)
            )
            stats_list = result.scalars().all()
            
            for stats in stats_list:
                if float(stats.avg_price_7d or 0) < self.MIN_SIGNAL_PRICE:
                    continue
                volume_trend = float(stats.volume_trend_7d or 0)
                volume_7d = stats.volume_7d or 0
                
                if volume_7d < 10:
                    continue
                
                if volume_trend >= self.config.SUPPLY_INCREASE_THRESHOLD:
                    signals.append(self._create_signal(
                        signal_type='supply_surge',
                        signal_level='medium',
                        product_name=stats.product_name,
                        product_set=stats.product_set,
                        category=stats.category,
                        current_price=stats.avg_price_7d,
                        market_avg_price=stats.avg_price_30d,
                        description=f"{stats.product_name}: {volume_trend:+.0f}% more listings — increased supply may push prices down",
                        metadata={'volume_trend': round(volume_trend, 2), 'volume_7d': volume_7d},
                        priority=5,
                    ))
                elif volume_trend <= self.config.SUPPLY_DECREASE_THRESHOLD:
                    if volume_trend <= -60:
                        level = 'high'
                        confidence = 80
                    elif volume_trend <= -40:
                        level = 'medium'
                        confidence = 65
                    else:
                        level = 'low'
                        confidence = 55

                    signals.append(self._create_signal(
                        signal_type='supply_drop',
                        signal_level=level,
                        product_name=stats.product_name,
                        product_set=stats.product_set,
                        category=stats.category,
                        current_price=stats.avg_price_7d,
                        market_avg_price=stats.avg_price_30d,
                        description=f"{stats.product_name}: {volume_trend:+.0f}% fewer listings — shrinking supply, price may rise",
                        metadata={'volume_trend': round(volume_trend, 2), 'volume_7d': volume_7d},
                        priority=7,
                        confidence=confidence,
                    ))
        
        logger.info(f"Generated {len(signals)} supply signals")
        return signals
    
    # ─── Volatility Spike: unstable prices ──────────────────────
    
    async def _generate_volatility_signals(self) -> List[Signal]:
        signals = []
        
        async with AsyncSessionLocal() as session:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
            result = await session.execute(
                select(MarketStats).where(MarketStats.calculated_at >= cutoff)
            )
            stats_list = result.scalars().all()
            
            for stats in stats_list:
                volatility = float(stats.volatility or 0)
                avg_price = float(stats.avg_price_30d or 0)
                
                if volatility >= self.config.VOLATILITY_SPIKE_THRESHOLD and avg_price > 1.0:
                    signals.append(self._create_signal(
                        signal_type='volatility',
                        signal_level='medium',
                        product_name=stats.product_name,
                        product_set=stats.product_set,
                        category=stats.category,
                        current_price=stats.avg_price_7d,
                        market_avg_price=stats.avg_price_30d,
                        description=f"{stats.product_name}: high price volatility ({volatility:.0f}%) — unstable market, trade with caution",
                        metadata={'volatility': round(volatility, 2)},
                        priority=6,
                    ))
        
        logger.info(f"Generated {len(signals)} volatility signals")
        return signals
    
    # ─── Set Trends: entire sets moving ─────────────────────────
    
    async def _generate_set_trend_signals(self) -> List[Signal]:
        signals = []
        
        async with AsyncSessionLocal() as session:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
            
            # Aggregate trends per set
            result = await session.execute(
                select(
                    MarketStats.product_set,
                    func.avg(MarketStats.price_trend_7d).label('avg_trend'),
                    func.avg(MarketStats.volume_trend_7d).label('avg_volume_trend'),
                    func.count(MarketStats.id).label('card_count'),
                    func.avg(MarketStats.avg_price_7d).label('avg_set_price'),
                )
                .where(and_(
                    MarketStats.calculated_at >= cutoff,
                    MarketStats.product_set.isnot(None),
                ))
                .group_by(MarketStats.product_set)
                .having(func.count(MarketStats.id) >= 3)
            )
            set_stats = result.all()
            
            for row in set_stats:
                avg_trend = float(row.avg_trend or 0)
                avg_vol_trend = float(row.avg_volume_trend or 0)
                card_count = row.card_count
                avg_price = float(row.avg_set_price or 0)
                
                if abs(avg_trend) < self.config.SET_TREND_THRESHOLD:
                    continue
                
                if avg_trend > 0:
                    if avg_trend >= 75:
                        level = 'high'
                        confidence = min(92, 70 + avg_trend / 15)
                    elif avg_trend >= 25:
                        level = 'medium'
                        confidence = 60 + avg_trend / 5
                    else:
                        level = 'low'
                        confidence = 50 + avg_trend

                    signals.append(self._create_signal(
                        signal_type='set_rising',
                        signal_level=level,
                        product_name=row.product_set,
                        product_set=row.product_set,
                        category='set_trend',
                        current_price=Decimal(str(round(avg_price, 2))),
                        market_avg_price=None,
                        description=f"{row.product_set} is trending up: avg +{avg_trend:.1f}% across {card_count} cards",
                        metadata={
                            'avg_trend': round(avg_trend, 2),
                            'avg_volume_trend': round(avg_vol_trend, 2),
                            'card_count': card_count,
                        },
                        priority=8,
                        confidence=round(min(92, confidence), 1),
                    ))
                else:
                    abs_trend = abs(avg_trend)
                    if abs_trend >= 75:
                        level = 'high'
                        confidence = min(92, 70 + abs_trend / 15)
                    elif abs_trend >= 25:
                        level = 'medium'
                        confidence = 60 + abs_trend / 5
                    else:
                        level = 'low'
                        confidence = 50 + abs_trend

                    signals.append(self._create_signal(
                        signal_type='set_declining',
                        signal_level=level,
                        product_name=row.product_set,
                        product_set=row.product_set,
                        category='set_trend',
                        current_price=Decimal(str(round(avg_price, 2))),
                        market_avg_price=None,
                        description=f"{row.product_set} is declining: avg {avg_trend:.1f}% across {card_count} cards",
                        metadata={
                            'avg_trend': round(avg_trend, 2),
                            'avg_volume_trend': round(avg_vol_trend, 2),
                            'card_count': card_count,
                        },
                        priority=6,
                        confidence=round(min(92, confidence), 1),
                    ))
        
        logger.info(f"Generated {len(signals)} set trend signals")
        return signals

    # ─── Sustained Uptrend: rising on both 7d and 30d ────────────

    async def _generate_sustained_uptrend_signals(self) -> List[Signal]:
        """
        Cards where price is rising on BOTH the 7-day and 30-day window.
        More reliable than single-period momentum — rules out short spikes.
        """
        signals = []

        async with AsyncSessionLocal() as session:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
            result = await session.execute(
                select(MarketStats).where(MarketStats.calculated_at >= cutoff)
            )
            stats_list = result.scalars().all()

            for stats in stats_list:
                if float(stats.avg_price_7d or 0) < self.MIN_SIGNAL_PRICE:
                    continue
                price_7d = float(stats.price_trend_7d or 0)
                price_30d = float(stats.price_trend_30d or 0)

                if price_7d < 8 or price_30d < 5:
                    continue

                # Skip cards already captured by momentum (avoid duplicates)
                volume_trend = float(stats.volume_trend_7d or 0)
                if (price_7d >= self.config.MOMENTUM_PRICE_CHANGE and
                        volume_trend >= self.config.MOMENTUM_VOLUME_CHANGE):
                    continue

                if price_7d >= 30 and price_30d >= 15:
                    level = 'high'
                    confidence = min(92, 65 + price_30d / 3)
                elif price_7d >= 15 and price_30d >= 8:
                    level = 'medium'
                    confidence = 60 + price_30d / 4
                else:
                    level = 'low'
                    confidence = 55 + price_7d / 4

                signals.append(self._create_signal(
                    signal_type='sustained_uptrend',
                    signal_level=level,
                    product_name=stats.product_name,
                    product_set=stats.product_set,
                    category=stats.category,
                    current_price=stats.avg_price_7d,
                    market_avg_price=stats.avg_price_30d,
                    description=(
                        f"{stats.product_name}: consistent price increase "
                        f"(+{price_7d:.1f}% this week, +{price_30d:.1f}% this month)"
                    ),
                    metadata={
                        'price_trend_7d': round(price_7d, 2),
                        'price_trend_30d': round(price_30d, 2),
                    },
                    priority=7,
                    confidence=round(min(92, confidence), 1),
                ))

        logger.info(f"Generated {len(signals)} sustained uptrend signals")
        return signals

    # ─── Consecutive Rising: 3+ days of price increase ───────────

    async def _generate_consecutive_rising_signals(self) -> List[Signal]:
        """
        Cards where the daily average price went up on each of the last 3
        consecutive days. Detects early momentum before the weekly trend
        window captures it.
        """
        from sqlalchemy import text as sa_text
        signals = []

        async with AsyncSessionLocal() as session:
            result = await session.execute(sa_text("""
                WITH daily_prices AS (
                    SELECT
                        card_name,
                        card_set,
                        DATE(scraped_at AT TIME ZONE 'UTC') AS day,
                        AVG(price)   AS avg_price,
                        COUNT(*)     AS listing_count
                    FROM raw_prices
                    WHERE scraped_at >= NOW() - INTERVAL '5 days'
                      AND price > 2.0
                    GROUP BY card_name, card_set,
                             DATE(scraped_at AT TIME ZONE 'UTC')
                ),
                pivoted AS (
                    SELECT
                        card_name, card_set,
                        MAX(CASE WHEN day = CURRENT_DATE - 3 THEN avg_price END) AS d3,
                        MAX(CASE WHEN day = CURRENT_DATE - 2 THEN avg_price END) AS d2,
                        MAX(CASE WHEN day = CURRENT_DATE - 1 THEN avg_price END) AS d1,
                        MAX(CASE WHEN day = CURRENT_DATE     THEN avg_price END) AS d0,
                        SUM(listing_count) AS total_count
                    FROM daily_prices
                    GROUP BY card_name, card_set
                )
                SELECT
                    card_name,
                    card_set,
                    d3, d2, d1, d0,
                    ROUND(((d0 - d3) / NULLIF(d3, 0) * 100)::numeric, 1) AS total_rise_pct
                FROM pivoted
                WHERE d3 IS NOT NULL AND d2 IS NOT NULL
                  AND d1 IS NOT NULL AND d0 IS NOT NULL
                  AND d0 > d1 AND d1 > d2 AND d2 > d3
                  AND total_count >= 6
                ORDER BY total_rise_pct DESC
                LIMIT 40
            """))
            rows = result.fetchall()

            for row in rows:
                rise_pct = float(row.total_rise_pct or 0)
                if rise_pct < 5:
                    continue

                current_price = float(row.d0)
                start_price = float(row.d3)

                if rise_pct >= 25:
                    level = 'high'
                    confidence = min(88, 65 + rise_pct / 4)
                elif rise_pct >= 12:
                    level = 'medium'
                    confidence = 60 + rise_pct / 4
                else:
                    level = 'low'
                    confidence = 55 + rise_pct / 2

                signals.append(self._create_signal(
                    signal_type='consecutive_rising',
                    signal_level=level,
                    product_name=row.card_name,
                    product_set=row.card_set or '',
                    category='single',
                    current_price=Decimal(str(round(current_price, 2))),
                    market_avg_price=Decimal(str(round(start_price, 2))),
                    description=(
                        f"{row.card_name}: price rose every day for 3 days "
                        f"(+{rise_pct:.1f}% total, €{start_price:.2f} → €{current_price:.2f})"
                    ),
                    metadata={
                        'rise_pct_3d': round(rise_pct, 1),
                        'price_d0': round(current_price, 2),
                        'price_d3': round(start_price, 2),
                        'days_rising': 3,
                    },
                    priority=8,
                    confidence=round(min(88, confidence), 1),
                ))

        logger.info(f"Generated {len(signals)} consecutive rising signals")
        return signals

    async def _generate_market_mover_fallback(self) -> List[Signal]:
        """
        When strict thresholds match nothing, still publish top absolute 7d price movers
        so the Signals feed is not empty (Railway users saw zero rows after LONG_WINDOW shrink).
        """
        signals: List[Signal] = []
        cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
        min_abs = 6.0
        limit_n = 60

        async with AsyncSessionLocal() as session:
            pt = MarketStats.price_trend_7d
            abs_pt = func.abs(pt)
            result = await session.execute(
                select(MarketStats)
                .where(
                    and_(
                        MarketStats.calculated_at >= cutoff,
                        abs_pt >= min_abs,
                        MarketStats.avg_price_7d >= self.MIN_SIGNAL_PRICE,
                    )
                )
                .order_by(abs_pt.desc())
                .limit(limit_n)
            )
            for stats in result.scalars().all():
                price_trend = float(stats.price_trend_7d or 0)
                signals.append(
                    self._create_signal(
                        signal_type="market_mover",
                        signal_level="low",
                        product_name=stats.product_name,
                        product_set=stats.product_set or "",
                        category=stats.category or "single",
                        current_price=stats.avg_price_7d,
                        market_avg_price=stats.avg_price_30d,
                        description=(
                            f"{stats.product_name}: 7d price {price_trend:+.1f}% "
                            f"— notable move vs week start (watchlist / due diligence)"
                        ),
                        metadata={
                            "price_trend_7d": round(price_trend, 2),
                            "signal_mode": "fallback_mover",
                        },
                        priority=4,
                    )
                )

        logger.info(f"Generated {len(signals)} market_mover fallback signals")
        return signals
    
    # ─── Helper ─────────────────────────────────────────────────
    
    def _create_signal(
        self,
        signal_type: str,
        signal_level: str,
        product_name: str,
        product_set: str,
        category: str,
        current_price,
        market_avg_price,
        description: str,
        metadata: dict = None,
        priority: int = 0,
        confidence: float = 80.0,
    ) -> Signal:
        return Signal(
            signal_type=signal_type,
            signal_level=signal_level,
            product_name=product_name,
            product_set=product_set,
            category=category,
            current_price=current_price,
            market_avg_price=market_avg_price,
            deal_score=None,
            description=description,
            signal_metadata=json.dumps(metadata) if metadata else None,
            confidence=Decimal(str(round(confidence, 1))),
            priority=priority,
            is_active=True,
            is_sent=False,
            detected_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
