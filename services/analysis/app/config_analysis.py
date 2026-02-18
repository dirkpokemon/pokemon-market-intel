"""
Analysis Service Configuration
Thresholds and parameters for market analysis and deal scoring
"""

from typing import Dict
from pydantic_settings import BaseSettings


class AnalysisConfig(BaseSettings):
    """
    Configuration for analysis engine
    """
    
    # Time windows (days)
    SHORT_WINDOW_DAYS: int = 7
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
    
    # Signal thresholds
    DEAL_SCORE_HIGH: float = 80.0
    DEAL_SCORE_MEDIUM: float = 60.0
    
    PRICE_DEVIATION_UNDERVALUED: float = 20.0  # % below market avg
    PRICE_ARBITRAGE_THRESHOLD: float = 15.0    # % difference between countries
    
    MOMENTUM_PRICE_CHANGE: float = 10.0   # % increase
    MOMENTUM_VOLUME_CHANGE: float = 20.0  # % increase
    
    RISK_VOLUME_DROP: float = -30.0  # % decrease
    RISK_PRICE_RISE: float = 20.0    # % increase
    
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
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_prefix = "ANALYSIS_"


# Singleton instance
analysis_config = AnalysisConfig()
