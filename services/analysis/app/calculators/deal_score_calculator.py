"""
Deal Score Calculator
Implements the weighted deal scoring formula
"""

import logging
from typing import Optional
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.config_analysis import analysis_config
from app.database import AsyncSessionLocal
from app.models.deal_score import DealScore
from app.models.market_stats import MarketStats

logger = logging.getLogger(__name__)


class DealScoreCalculator:
    """
    Calculates deal scores using weighted formula:
    Deal Score = (Price deviation × 0.4) +
                 (Volume trend × 0.3) +
                 (Liquidity × 0.2) +
                 (Set popularity × 0.1)
    """
    
    def __init__(self):
        self.config = analysis_config
        logger.info("DealScoreCalculator initialized")
    
    async def calculate_all(self) -> int:
        """
        Calculate deal scores for all products with market stats
        
        Returns:
            Number of deal scores calculated
        """
        logger.info("Starting deal score calculation")
        
        async with AsyncSessionLocal() as session:
            # Get recent market stats
            cutoff = datetime.utcnow() - timedelta(hours=24)
            query = select(MarketStats).where(
                MarketStats.calculated_at >= cutoff
            )
            
            result = await session.execute(query)
            market_stats = result.scalars().all()
            
            if not market_stats:
                logger.warning("No market stats found")
                return 0
            
            logger.info(f"Calculating deal scores for {len(market_stats)} products")
            
            deal_scores = []
            for stats in market_stats:
                try:
                    score = await self._calculate_deal_score(stats)
                    if score:
                        deal_scores.append(score)
                except Exception as e:
                    logger.error(f"Error calculating deal score for {stats.product_name}: {e}")
                    continue
            
            # Save to database
            if deal_scores:
                session.add_all(deal_scores)
                await session.commit()
                logger.info(f"Saved {len(deal_scores)} deal scores")
            
            return len(deal_scores)
    
    async def _calculate_deal_score(self, stats: MarketStats) -> Optional[DealScore]:
        """
        Calculate deal score for a product using market stats
        
        Args:
            stats: MarketStats record
            
        Returns:
            DealScore record or None
        """
        # Use minimum price as current best deal
        current_price = float(stats.min_price_7d or stats.min_price_30d or 0)
        market_avg = float(stats.avg_price_30d or 0)
        
        if current_price == 0 or market_avg == 0:
            return None
        
        # Calculate each component (0-100 scale)
        price_dev_score = self._calculate_price_deviation_score(current_price, market_avg)
        volume_trend_score = self._calculate_volume_trend_score(
            float(stats.volume_trend_7d or 0)
        )
        liquidity_score = float(stats.liquidity_score or 0)
        popularity_score = self._calculate_popularity_score(stats.product_set)
        
        # Calculate weighted composite score
        deal_score = (
            price_dev_score * self.config.WEIGHT_PRICE_DEVIATION +
            volume_trend_score * self.config.WEIGHT_VOLUME_TREND +
            liquidity_score * self.config.WEIGHT_LIQUIDITY +
            popularity_score * self.config.WEIGHT_POPULARITY
        )
        
        # Calculate confidence based on data quality
        confidence = self._calculate_confidence(stats.data_quality, stats.sample_size)
        
        # Calculate expiration (24 hours)
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        return DealScore(
            product_name=stats.product_name,
            product_set=stats.product_set,
            category=stats.category,
            
            current_price=Decimal(str(current_price)),
            currency='EUR',
            condition='NM',  # Assumed best condition for deal
            source='Aggregated',
            
            market_avg_price=Decimal(str(market_avg)),
            market_min_price=Decimal(str(float(stats.min_price_30d or 0))),
            
            # Component scores
            price_deviation_score=Decimal(str(round(price_dev_score, 2))),
            volume_trend_score=Decimal(str(round(volume_trend_score, 2))),
            liquidity_score=Decimal(str(round(liquidity_score, 2))),
            popularity_score=Decimal(str(round(popularity_score, 2))),
            
            # Final score
            deal_score=Decimal(str(round(deal_score, 2))),
            
            confidence=Decimal(str(round(confidence, 2))),
            data_quality=stats.data_quality,
            
            is_active=True,
            expires_at=expires_at,
            calculated_at=datetime.utcnow(),
        )
    
    def _calculate_price_deviation_score(self, current_price: float, market_avg: float) -> float:
        """
        Calculate price deviation score (0-100)
        Higher score = better deal (lower price vs average)
        
        Args:
            current_price: Current listing price
            market_avg: Market average price
            
        Returns:
            Score 0-100
        """
        if market_avg == 0:
            return 0.0
        
        # Calculate percentage below market average
        deviation = ((market_avg - current_price) / market_avg) * 100
        
        # Convert to 0-100 scale
        # 50% below average = 100 score
        # 0% below (at average) = 50 score
        # 50% above average = 0 score
        
        if deviation >= 50:
            return 100.0
        elif deviation >= 0:
            # Linear scale from 50-100
            return 50.0 + (deviation / 50.0) * 50.0
        else:
            # Above average, score decreases
            # Cap at -50% (very overpriced)
            if deviation <= -50:
                return 0.0
            # Linear scale from 0-50
            return 50.0 + (deviation / 50.0) * 50.0
    
    def _calculate_volume_trend_score(self, volume_trend: float) -> float:
        """
        Calculate volume trend score (0-100)
        Higher positive trend = higher score (growing interest)
        
        Args:
            volume_trend: Volume trend percentage
            
        Returns:
            Score 0-100
        """
        # Positive trend is good (more listings = more competition/liquidity)
        # +100% trend = 100 score
        # 0% trend = 50 score
        # -50% trend = 0 score
        
        if volume_trend >= 100:
            return 100.0
        elif volume_trend >= 0:
            return 50.0 + (volume_trend / 100.0) * 50.0
        else:
            # Negative trend
            if volume_trend <= -50:
                return 0.0
            return 50.0 + (volume_trend / 50.0) * 50.0
    
    def _calculate_popularity_score(self, product_set: str) -> float:
        """
        Calculate popularity score based on set
        
        Args:
            product_set: Pokemon set name
            
        Returns:
            Score 0-100
        """
        return self.config.POPULAR_SETS.get(
            product_set,
            self.config.DEFAULT_POPULARITY
        )
    
    def _calculate_confidence(self, data_quality: str, sample_size: int) -> float:
        """
        Calculate confidence in deal score based on data quality
        
        Args:
            data_quality: Quality label
            sample_size: Number of data points
            
        Returns:
            Confidence 0-100
        """
        quality_scores = {
            'excellent': 100.0,
            'good': 80.0,
            'fair': 60.0,
            'poor': 40.0,
            'insufficient': 20.0,
        }
        
        base_confidence = quality_scores.get(data_quality, 50.0)
        
        # Adjust based on sample size
        if sample_size >= 100:
            return base_confidence
        elif sample_size >= 50:
            return base_confidence * 0.95
        elif sample_size >= 20:
            return base_confidence * 0.85
        else:
            return base_confidence * 0.70
