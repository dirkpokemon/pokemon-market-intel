"""
Analysis Service Configuration
Thresholds and parameters for market analysis and deal scoring
"""

from typing import Dict
from pydantic_settings import BaseSettings, SettingsConfigDict


class AnalysisConfig(BaseSettings):
    """
    Configuration for analysis engine
    """

    model_config = SettingsConfigDict(env_prefix="ANALYSIS_", env_file=".env", extra="ignore")

    # Time windows (days)
    SHORT_WINDOW_DAYS: int = 7
    # Must stay aligned with volume_trend baseline in market_stats (_calculate_volume_trend divides by this).
    # Shorter windows shrink volume_trend % and starve strict signal rules (e.g. momentum +30% volume).
    LONG_WINDOW_DAYS: int = 30
    
    # Data quality thresholds
    MIN_SAMPLES_EXCELLENT: int = 50
    MIN_SAMPLES_GOOD: int = 20
    MIN_SAMPLES_FAIR: int = 10
    MIN_SAMPLES_POOR: int = 5
    
    # Currency conversion (to EUR)
    CURRENCY_RATES: Dict[str, float] = {
        'EUR': 1.0,
        'USD': 0.92,  # Update with real rates
        'GBP': 1.17,
        'CHF': 1.06,
        'PLN': 0.23,
    }
    
    # Condition normalization mapping
    CONDITION_MAP: Dict[str, str] = {
        'mint': 'NM',
        'near mint': 'NM',
        'nm': 'NM',
        'm': 'NM',
        'lightly played': 'LP',
        'light play': 'LP',
        'lp': 'LP',
        'moderately played': 'MP',
        'mp': 'MP',
        'played': 'PL',
        'pl': 'PL',
        'heavily played': 'HP',
        'hp': 'HP',
        'poor': 'PO',
        'po': 'PO',
        'damaged': 'DM',
    }
    
    # Deal Score Weights (must sum to 1.0)
    WEIGHT_PRICE_DEVIATION: float = 0.4
    WEIGHT_VOLUME_TREND: float = 0.3
    WEIGHT_LIQUIDITY: float = 0.2
    WEIGHT_POPULARITY: float = 0.1
    
    # Signal thresholds (tuned to avoid noise with limited history)
    MOMENTUM_PRICE_CHANGE: float = 15.0   # % increase
    MOMENTUM_VOLUME_CHANGE: float = 30.0  # % increase
    
    RISK_VOLUME_DROP: float = -40.0  # % decrease
    RISK_PRICE_RISE: float = 25.0    # % increase
    
    PRICE_DROP_THRESHOLD: float = -20.0        # % decrease in 7d
    SUPPLY_INCREASE_THRESHOLD: float = 80.0    # % more listings vs 30d avg
    SUPPLY_DECREASE_THRESHOLD: float = -50.0   # % fewer listings vs 30d avg
    VOLATILITY_SPIKE_THRESHOLD: float = 100.0  # coefficient of variation %
    SET_TREND_THRESHOLD: float = 12.0          # % set-wide avg price change
    
    # Liquidity scoring
    HIGH_LIQUIDITY_VOLUME: int = 100   # listings
    MED_LIQUIDITY_VOLUME: int = 50
    LOW_LIQUIDITY_VOLUME: int = 20
    
    # Popularity scoring (by set)
    POPULAR_SETS: Dict[str, float] = {
        'Base Set': 100.0,
        '151': 95.0,
        'Paldean Fates': 90.0,
        'Obsidian Flames': 85.0,
        'Scarlet-Violet-151': 95.0,
        'Paradox Rift': 80.0,
    }
    DEFAULT_POPULARITY: float = 50.0
    
    # Outlier detection
    OUTLIER_THRESHOLD: float = 3.0  # Standard deviations
    
    # Performance
    BATCH_SIZE: int = 1000
    MAX_CONCURRENT_TASKS: int = 4
    # Stream raw_prices in chunks (ORM .all() on huge tables OOMs on Railway)
    RAW_FETCH_BATCH_SIZE: int = 6000
    # Per product: keep only the last N points (by stream order ≈ rising id ≈ recent scrapes). Stops RAM from growing with millions of duplicate listings.
    MAX_LISTINGS_PER_PRODUCT: int = 1500

    # Disk: append-only raw_prices fills small Postgres volumes. Each full analysis run
    # deletes rows older than this many days (batched). Set ANALYSIS_RAW_PRICES_RETENTION_DAYS=0 to disable.
    # Default 60 keeps ~2× the default LONG_WINDOW (30) for safety + price-history headroom.
    RAW_PRICES_RETENTION_DAYS: int = 60
    RAW_PRICES_PRUNE_BATCH_ROWS: int = 40000
    RAW_PRICES_PRUNE_MAX_BATCHES_PER_RUN: int = 25
    
    # Logging
    LOG_LEVEL: str = "INFO"


# Singleton instance
analysis_config = AnalysisConfig()
