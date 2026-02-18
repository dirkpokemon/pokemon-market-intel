"""
Market Statistics Calculator
Calculates market metrics per product from raw price data
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pandas as pd
import numpy as np
from sqlalchemy import select, and_, func

from app.config_analysis import analysis_config
from app.database import AsyncSessionLocal
from app.models.market_stats import MarketStats
from app.normalizers.data_normalizer import DataNormalizer

logger = logging.getLogger(__name__)


class MarketStatsCalculator:
    """
    Calculates comprehensive market statistics per product
    """
    
    def __init__(self):
        self.config = analysis_config
        self.normalizer = DataNormalizer()
        logger.info("MarketStatsCalculator initialized")
    
    async def calculate_all(self) -> int:
        """
        Calculate market stats for all products
        
        Returns:
            Number of products processed
        """
        logger.info("Starting market statistics calculation")
        
        async with AsyncSessionLocal() as session:
            # Fetch raw price data from last 30 days
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.config.LONG_WINDOW_DAYS)
            
            # Query raw prices
            from app.models import RawPrice  # Assuming raw_prices table exists
            query = select(RawPrice).where(
                RawPrice.scraped_at >= cutoff_date
            )
            
            result = await session.execute(query)
            raw_prices = result.scalars().all()
            
            if not raw_prices:
                logger.warning("No raw price data found")
                return 0
            
            logger.info(f"Processing {len(raw_prices)} raw price records")
            
            # Convert to DataFrame for analysis
            df = self._to_dataframe(raw_prices)
            
            # Normalize data
            df = self._normalize_data(df)
            
            # Group by product
            stats_records = []
            grouped = df.groupby(['product_name', 'product_set', 'category'])
            
            for (product_name, product_set, category), group in grouped:
                try:
                    stats = await self._calculate_product_stats(
                        product_name, product_set, category, group
                    )
                    if stats:
                        stats_records.append(stats)
                except Exception as e:
                    logger.error(f"Error calculating stats for {product_name}: {e}")
                    continue
            
            # Save to database
            if stats_records:
                session.add_all(stats_records)
                await session.commit()
                logger.info(f"Saved {len(stats_records)} market stat records")
            
            return len(stats_records)
    
    def _to_dataframe(self, raw_prices: List) -> pd.DataFrame:
        """
        Convert raw price objects to DataFrame
        """
        data = []
        for price in raw_prices:
            data.append({
                'product_name': price.card_name,
                'product_set': price.card_set,
                'category': 'single' if price.card_number else 'sealed',
                'price': float(price.price),
                'currency': price.currency,
                'condition': price.condition,
                'scraped_at': price.scraped_at,
                'source': price.source,
            })
        
        return pd.DataFrame(data)
    
    def _normalize_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Normalize prices and conditions
        """
        # Convert prices to EUR
        df['price_eur'] = df.apply(
            lambda row: self.normalizer.normalize_price(row['price'], row['currency']),
            axis=1
        )
        
        # Normalize conditions
        df['condition_normalized'] = df['condition'].apply(
            self.normalizer.normalize_condition
        )
        
        # Normalize product names
        df['product_name'] = df['product_name'].apply(
            self.normalizer.normalize_product_name
        )
        
        # Normalize set names
        df['product_set'] = df['product_set'].apply(
            self.normalizer.normalize_set_name
        )
        
        return df
    
    async def _calculate_product_stats(
        self,
        product_name: str,
        product_set: str,
        category: str,
        df: pd.DataFrame
    ) -> Optional[MarketStats]:
        """
        Calculate statistics for a single product
        """
        # Filter out outliers
        prices = df['price_eur'].values
        is_outlier = self.normalizer.detect_outliers(prices.tolist())
        # Ensure boolean array has same index as DataFrame
        df_clean = df[~pd.Series(is_outlier, index=df.index)]
        
        if len(df_clean) < self.config.MIN_SAMPLES_POOR:
            logger.debug(f"Insufficient data for {product_name}: {len(df_clean)} samples")
            return None
        
        # Calculate 7-day stats
        # Ensure timezone-aware datetime for comparison
        cutoff_7d = datetime.now(timezone.utc) - timedelta(days=self.config.SHORT_WINDOW_DAYS)
        df_7d = df_clean[df_clean['scraped_at'] >= cutoff_7d]
        
        # Calculate 30-day stats (use all clean data)
        df_30d = df_clean
        
        # 7-day metrics
        stats_7d = self._calculate_window_stats(df_7d) if len(df_7d) > 0 else {}
        
        # 30-day metrics
        stats_30d = self._calculate_window_stats(df_30d)
        
        # Calculate trends (cap at ±999.99 to fit Numeric(5,2) database column)
        price_trend_7d = max(-999.99, min(999.99, self._calculate_trend(df_7d, 'price_eur'))) if len(df_7d) > 1 else 0
        price_trend_30d = max(-999.99, min(999.99, self._calculate_trend(df_30d, 'price_eur'))) if len(df_30d) > 1 else 0
        volume_trend_7d = max(-999.99, min(999.99, self._calculate_volume_trend(df_7d, df_30d)))
        volume_trend_30d = 0  # Would need longer history
        
        # Calculate liquidity score
        liquidity = self._calculate_liquidity_score(len(df_30d))
        
        # Calculate volatility
        volatility = self._calculate_volatility(df_30d['price_eur'].values)
        
        # Determine data quality
        data_quality = self.normalizer.calculate_quality_score(len(df_30d))
        
        # Helper to cap values to database column limits
        def cap_price(value):
            return max(0, min(99999999.99, value))  # Numeric(10,2) max
        
        def cap_trend(value):
            return max(-999.99, min(999.99, value))  # Numeric(5,2) max
        
        def cap_score(value):
            return max(0, min(999.99, value))  # Numeric(5,2) max
        
        # Create MarketStats record
        return MarketStats(
            product_name=product_name,
            product_set=product_set,
            category=category,
            
            # 7-day stats (cap to Numeric(10,2))
            avg_price_7d=Decimal(str(round(cap_price(stats_7d.get('mean', 0)), 2))),
            min_price_7d=Decimal(str(round(cap_price(stats_7d.get('min', 0)), 2))),
            max_price_7d=Decimal(str(round(cap_price(stats_7d.get('max', 0)), 2))),
            volume_7d=len(df_7d),
            
            # 30-day stats (cap to Numeric(10,2))
            avg_price_30d=Decimal(str(round(cap_price(stats_30d.get('mean', 0)), 2))),
            min_price_30d=Decimal(str(round(cap_price(stats_30d.get('min', 0)), 2))),
            max_price_30d=Decimal(str(round(cap_price(stats_30d.get('max', 0)), 2))),
            volume_30d=len(df_30d),
            
            # Trends (cap to Numeric(5,2))
            price_trend_7d=Decimal(str(round(cap_trend(price_trend_7d), 2))),
            price_trend_30d=Decimal(str(round(cap_trend(price_trend_30d), 2))),
            volume_trend_7d=Decimal(str(round(cap_trend(volume_trend_7d), 2))),
            volume_trend_30d=Decimal(str(round(cap_trend(volume_trend_30d), 2))),
            
            # Metrics (cap to Numeric(5,2))
            liquidity_score=Decimal(str(round(cap_score(liquidity), 2))),
            volatility=Decimal(str(round(cap_score(volatility), 2))),
            
            # Metadata
            sample_size=len(df_30d),
            data_quality=data_quality,
            calculated_at=datetime.now(timezone.utc),
        )
    
    def _calculate_window_stats(self, df: pd.DataFrame) -> Dict:
        """
        Calculate basic statistics for a time window
        """
        if len(df) == 0:
            return {'mean': 0, 'min': 0, 'max': 0, 'median': 0}
        
        prices = df['price_eur'].values
        return {
            'mean': float(np.mean(prices)),
            'min': float(np.min(prices)),
            'max': float(np.max(prices)),
            'median': float(np.median(prices)),
            'std': float(np.std(prices)) if len(prices) > 1 else 0,
        }
    
    def _calculate_trend(self, df: pd.DataFrame, column: str) -> float:
        """
        Calculate trend as percentage change from first to last
        
        Returns:
            Percentage change (positive = increasing, negative = decreasing)
        """
        if len(df) < 2:
            return 0.0
        
        # Sort by date
        df_sorted = df.sort_values('scraped_at')
        
        # Get first and last values
        first_value = df_sorted[column].iloc[0]
        last_value = df_sorted[column].iloc[-1]
        
        if first_value == 0:
            return 0.0
        
        change = ((last_value - first_value) / first_value) * 100
        return float(change)
    
    def _calculate_volume_trend(self, df_short: pd.DataFrame, df_long: pd.DataFrame) -> float:
        """
        Calculate volume trend (7d vs 30d average daily volume)
        """
        if len(df_short) == 0 or len(df_long) == 0:
            return 0.0
        
        # Average daily volume
        volume_7d_daily = len(df_short) / self.config.SHORT_WINDOW_DAYS
        volume_30d_daily = len(df_long) / self.config.LONG_WINDOW_DAYS
        
        if volume_30d_daily == 0:
            return 0.0
        
        change = ((volume_7d_daily - volume_30d_daily) / volume_30d_daily) * 100
        return float(change)
    
    def _calculate_liquidity_score(self, volume: int) -> float:
        """
        Calculate liquidity score (0-100) based on listing volume
        
        Args:
            volume: Number of listings
            
        Returns:
            Liquidity score 0-100
        """
        if volume >= self.config.HIGH_LIQUIDITY_VOLUME:
            return 100.0
        elif volume >= self.config.MED_LIQUIDITY_VOLUME:
            # Linear interpolation between 50-100
            ratio = (volume - self.config.MED_LIQUIDITY_VOLUME) / \
                    (self.config.HIGH_LIQUIDITY_VOLUME - self.config.MED_LIQUIDITY_VOLUME)
            return 50.0 + (ratio * 50.0)
        elif volume >= self.config.LOW_LIQUIDITY_VOLUME:
            # Linear interpolation between 20-50
            ratio = (volume - self.config.LOW_LIQUIDITY_VOLUME) / \
                    (self.config.MED_LIQUIDITY_VOLUME - self.config.LOW_LIQUIDITY_VOLUME)
            return 20.0 + (ratio * 30.0)
        else:
            # Linear interpolation between 0-20
            ratio = volume / self.config.LOW_LIQUIDITY_VOLUME
            return ratio * 20.0
    
    def _calculate_volatility(self, prices: np.ndarray) -> float:
        """
        Calculate volatility as coefficient of variation
        
        Args:
            prices: Array of prices
            
        Returns:
            Volatility (coefficient of variation as percentage)
        """
        if len(prices) < 2:
            return 0.0
        
        mean = np.mean(prices)
        std = np.std(prices)
        
        if mean == 0:
            return 0.0
        
        cv = (std / mean) * 100
        return float(cv)
