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
        signals.extend(await self._generate_risk_signals())
        signals.extend(await self._generate_price_drop_signals())
        signals.extend(await self._generate_supply_signals())
        signals.extend(await self._generate_volatility_signals())
        signals.extend(await self._generate_set_trend_signals())
        
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
                    
                    signals.append(self._create_signal(
                        signal_type='momentum',
                        signal_level='high' if price_trend >= 20 else 'medium',
                        product_name=stats.product_name,
                        product_set=stats.product_set,
                        category=stats.category,
                        current_price=stats.avg_price_7d,
                        market_avg_price=stats.avg_price_30d,
                        description=f"{stats.product_name}: price +{price_trend:.1f}% and volume +{volume_trend:.1f}% in 7 days",
                        metadata={'price_trend': round(price_trend, 2), 'volume_trend': round(volume_trend, 2)},
                        priority=7,
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
                    
                    signals.append(self._create_signal(
                        signal_type='risk',
                        signal_level='high',
                        product_name=stats.product_name,
                        product_set=stats.product_set,
                        category=stats.category,
                        current_price=stats.avg_price_7d,
                        market_avg_price=stats.avg_price_30d,
                        description=f"Risk: {stats.product_name} price +{price_trend:.1f}% but volume {volume_trend:.1f}% — possible bubble",
                        metadata={'price_trend': round(price_trend, 2), 'volume_trend': round(volume_trend, 2)},
                        priority=9,
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
                    signals.append(self._create_signal(
                        signal_type='price_drop',
                        signal_level='high' if price_trend <= -25 else 'medium',
                        product_name=stats.product_name,
                        product_set=stats.product_set,
                        category=stats.category,
                        current_price=stats.avg_price_7d,
                        market_avg_price=stats.avg_price_30d,
                        description=f"{stats.product_name} dropped {price_trend:.1f}% in 7 days (avg was €{avg_price:.2f})",
                        metadata={'price_trend': round(price_trend, 2), 'avg_price_30d': round(avg_price, 2)},
                        priority=8,
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
                    signals.append(self._create_signal(
                        signal_type='supply_drop',
                        signal_level='high',
                        product_name=stats.product_name,
                        product_set=stats.product_set,
                        category=stats.category,
                        current_price=stats.avg_price_7d,
                        market_avg_price=stats.avg_price_30d,
                        description=f"{stats.product_name}: {volume_trend:+.0f}% fewer listings — shrinking supply, price may rise",
                        metadata={'volume_trend': round(volume_trend, 2), 'volume_7d': volume_7d},
                        priority=7,
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
                .having(func.count(MarketStats.id) >= 5)
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
                    signals.append(self._create_signal(
                        signal_type='set_rising',
                        signal_level='high' if avg_trend >= 15 else 'medium',
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
                    ))
                else:
                    signals.append(self._create_signal(
                        signal_type='set_declining',
                        signal_level='high' if avg_trend <= -15 else 'medium',
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
                    ))
        
        logger.info(f"Generated {len(signals)} set trend signals")
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
            confidence=Decimal('80.0'),
            priority=priority,
            is_active=True,
            is_sent=False,
            detected_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
