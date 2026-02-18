"""
Signal Generation Engine
Detects market signals and alerts based on deal scores and market stats
"""

import logging
from typing import List
from datetime import datetime, timedelta
from decimal import Decimal
import json

from sqlalchemy import select, and_

from app.config_analysis import analysis_config
from app.database import AsyncSessionLocal
from app.models.signal import Signal
from app.models.deal_score import DealScore
from app.models.market_stats import MarketStats

logger = logging.getLogger(__name__)


class SignalGenerator:
    """
    Generates market signals and alerts
    
    Signal Types:
    - high_deal: Deal score ≥ 80
    - medium_deal: Deal score ≥ 60
    - undervalued: Price deviation ≥ 20%
    - momentum: Price + volume trend rising
    - arbitrage: Country price differences ≥ 15%
    - risk: Volume ↓ + price ↑
    """
    
    def __init__(self):
        self.config = analysis_config
        logger.info("SignalGenerator initialized")
    
    async def generate_all(self) -> int:
        """
        Generate all signals from recent deal scores and market stats
        
        Returns:
            Number of signals generated
        """
        logger.info("Starting signal generation")
        
        signals = []
        
        # Generate deal-based signals
        deal_signals = await self._generate_deal_signals()
        signals.extend(deal_signals)
        
        # Generate momentum signals
        momentum_signals = await self._generate_momentum_signals()
        signals.extend(momentum_signals)
        
        # Generate risk signals
        risk_signals = await self._generate_risk_signals()
        signals.extend(risk_signals)
        
        # Generate undervalued signals
        undervalued_signals = await self._generate_undervalued_signals()
        signals.extend(undervalued_signals)
        
        # Save signals
        if signals:
            async with AsyncSessionLocal() as session:
                session.add_all(signals)
                await session.commit()
                logger.info(f"Generated {len(signals)} signals")
        
        return len(signals)
    
    async def _generate_deal_signals(self) -> List[Signal]:
        """
        Generate signals for high/medium deal scores
        """
        signals = []
        
        async with AsyncSessionLocal() as session:
            # Get recent deal scores
            cutoff = datetime.utcnow() - timedelta(hours=24)
            query = select(DealScore).where(
                and_(
                    DealScore.calculated_at >= cutoff,
                    DealScore.is_active == True
                )
            )
            
            result = await session.execute(query)
            deal_scores = result.scalars().all()
            
            for score in deal_scores:
                deal_value = float(score.deal_score)
                
                # High deal signal (score ≥ 80)
                if deal_value >= self.config.DEAL_SCORE_HIGH:
                    signal = self._create_signal(
                        signal_type='high_deal',
                        signal_level='high',
                        product_name=score.product_name,
                        product_set=score.product_set,
                        category=score.category,
                        current_price=score.current_price,
                        market_avg_price=score.market_avg_price,
                        deal_score=score.deal_score,
                        confidence=score.confidence,
                        description=f"Excellent deal detected: {score.product_name} at €{score.current_price} (score: {deal_value:.0f})",
                        signal_metadata=None,
                        priority=10,
                    )
                    signals.append(signal)
                
                # Medium deal signal (score ≥ 60)
                elif deal_value >= self.config.DEAL_SCORE_MEDIUM:
                    signal = self._create_signal(
                        signal_type='medium_deal',
                        signal_level='medium',
                        product_name=score.product_name,
                        product_set=score.product_set,
                        category=score.category,
                        current_price=score.current_price,
                        market_avg_price=score.market_avg_price,
                        deal_score=score.deal_score,
                        confidence=score.confidence,
                        description=f"Good deal detected: {score.product_name} at €{score.current_price} (score: {deal_value:.0f})",
                        signal_metadata=None,
                        priority=5,
                    )
                    signals.append(signal)
        
        logger.info(f"Generated {len(signals)} deal signals")
        return signals
    
    async def _generate_undervalued_signals(self) -> List[Signal]:
        """
        Generate signals for significantly undervalued products
        """
        signals = []
        
        async with AsyncSessionLocal() as session:
            cutoff = datetime.utcnow() - timedelta(hours=24)
            query = select(DealScore).where(
                and_(
                    DealScore.calculated_at >= cutoff,
                    DealScore.is_active == True
                )
            )
            
            result = await session.execute(query)
            deal_scores = result.scalars().all()
            
            for score in deal_scores:
                current = float(score.current_price)
                avg = float(score.market_avg_price)
                
                if avg == 0:
                    continue
                
                # Calculate price deviation
                deviation = ((avg - current) / avg) * 100
                
                # Undervalued if ≥ 20% below average
                if deviation >= self.config.PRICE_DEVIATION_UNDERVALUED:
                    signal = self._create_signal(
                        signal_type='undervalued',
                        signal_level='high',
                        product_name=score.product_name,
                        product_set=score.product_set,
                        category=score.category,
                        current_price=score.current_price,
                        market_avg_price=score.market_avg_price,
                        deal_score=score.deal_score,
                        confidence=score.confidence,
                        description=f"Undervalued: {score.product_name} is {deviation:.1f}% below market average",
                        signal_metadata=json.dumps({'deviation_pct': round(deviation, 2)}),
                        priority=8,
                    )
                    signals.append(signal)
        
        logger.info(f"Generated {len(signals)} undervalued signals")
        return signals
    
    async def _generate_momentum_signals(self) -> List[Signal]:
        """
        Generate signals for products with positive momentum
        (Price + volume trends both rising)
        """
        signals = []
        
        async with AsyncSessionLocal() as session:
            cutoff = datetime.utcnow() - timedelta(hours=24)
            query = select(MarketStats).where(
                MarketStats.calculated_at >= cutoff
            )
            
            result = await session.execute(query)
            market_stats = result.scalars().all()
            
            for stats in market_stats:
                price_trend = float(stats.price_trend_7d or 0)
                volume_trend = float(stats.volume_trend_7d or 0)
                
                # Momentum if both price and volume increasing
                if (price_trend >= self.config.MOMENTUM_PRICE_CHANGE and
                    volume_trend >= self.config.MOMENTUM_VOLUME_CHANGE):
                    
                    signal = self._create_signal(
                        signal_type='momentum',
                        signal_level='medium',
                        product_name=stats.product_name,
                        product_set=stats.product_set,
                        category=stats.category,
                        current_price=stats.avg_price_7d,
                        market_avg_price=stats.avg_price_30d,
                        deal_score=None,
                        confidence=Decimal('80.0'),
                        description=f"Momentum detected: {stats.product_name} - price up {price_trend:.1f}%, volume up {volume_trend:.1f}%",
                        signal_metadata=json.dumps({
                            'price_trend': round(price_trend, 2),
                            'volume_trend': round(volume_trend, 2)
                        }),
                        priority=6,
                    )
                    signals.append(signal)
        
        logger.info(f"Generated {len(signals)} momentum signals")
        return signals
    
    async def _generate_risk_signals(self) -> List[Signal]:
        """
        Generate risk signals (Volume ↓ + price ↑)
        Indicates potential bubble or manipulated prices
        """
        signals = []
        
        async with AsyncSessionLocal() as session:
            cutoff = datetime.utcnow() - timedelta(hours=24)
            query = select(MarketStats).where(
                MarketStats.calculated_at >= cutoff
            )
            
            result = await session.execute(query)
            market_stats = result.scalars().all()
            
            for stats in market_stats:
                price_trend = float(stats.price_trend_7d or 0)
                volume_trend = float(stats.volume_trend_7d or 0)
                
                # Risk if volume dropping but price rising
                if (volume_trend <= self.config.RISK_VOLUME_DROP and
                    price_trend >= self.config.RISK_PRICE_RISE):
                    
                    signal = self._create_signal(
                        signal_type='risk',
                        signal_level='high',
                        product_name=stats.product_name,
                        product_set=stats.product_set,
                        category=stats.category,
                        current_price=stats.avg_price_7d,
                        market_avg_price=stats.avg_price_30d,
                        deal_score=None,
                        confidence=Decimal('75.0'),
                        description=f"Risk signal: {stats.product_name} - price up {price_trend:.1f}% but volume down {volume_trend:.1f}%",
                        signal_metadata=json.dumps({
                            'price_trend': round(price_trend, 2),
                            'volume_trend': round(volume_trend, 2)
                        }),
                        priority=7,
                    )
                    signals.append(signal)
        
        logger.info(f"Generated {len(signals)} risk signals")
        return signals
    
    def _create_signal(
        self,
        signal_type: str,
        signal_level: str,
        product_name: str,
        product_set: str,
        category: str,
        current_price: Decimal,
        market_avg_price: Decimal,
        deal_score: Decimal,
        confidence: Decimal,
        description: str,
        signal_metadata: str = None,
        priority: int = 0
    ) -> Signal:
        """
        Create a Signal record
        """
        # Set expiration (24 hours for most signals)
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        return Signal(
            signal_type=signal_type,
            signal_level=signal_level,
            product_name=product_name,
            product_set=product_set,
            category=category,
            current_price=current_price,
            market_avg_price=market_avg_price,
            deal_score=deal_score,
            description=description,
            signal_metadata=signal_metadata,
            confidence=confidence,
            priority=priority,
            is_active=True,
            is_sent=False,
            detected_at=datetime.utcnow(),
            expires_at=expires_at,
        )
