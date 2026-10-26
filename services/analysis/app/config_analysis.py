"""
Analysis Service Configuration
Thresholds and parameters for market analysis and deal scoring
"""

from typing import Dict, List
from pydantic_settings import BaseSettings, SettingsConfigDict


class AnalysisConfig(BaseSettings):
    """
    Configuration for analysis engine
    """

    model_config = SettingsConfigDict(env_prefix="ANALYSIS_", env_file=".env", extra="ignore")

    # Time windows (days)
    SHORT_WINDOW_DAYS: int = 7
    LONG_WINDOW_DAYS: int = 30

    # Which listings are comparable. Mixing conditions (NM vs heavily played)
    # and languages made the "cheapest listing" a damaged or foreign copy.
    # Singles: only these normalized conditions; sealed products ignore condition.
    # Rows without a condition (e.g. CardMarket price guide = NM) are kept.
    INCLUDED_CONDITIONS: List[str] = ['near mint', 'nm', 'mint', 'm']
    # Each language is its own product line (separate statistics and deals).
    # 'JP' also covers CardTrader's 'JA' (see LANG_EXPR).
    INCLUDED_LANGUAGES: List[str] = ['EN', 'JP']

    # Data quality by number of distinct days a product was seen in the long window
    MIN_DAYS_EXCELLENT: int = 20
    MIN_DAYS_GOOD: int = 10
    MIN_DAYS_FAIR: int = 5
    MIN_DAYS_POOR: int = 2
    # Minimum listing observations in the long window to store stats at all
    MIN_OBSERVATIONS: int = 5

    # Deal scoring needs a "usual floor price", so require some history
    MIN_DAYS_FOR_DEAL: int = 3
    # Only score products seen in a recent scrape (scrapes run twice a day)
    CURRENT_MAX_AGE_HOURS: int = 36
    # A cheapest listing below this fraction of the typical price is treated as
    # a likely data error (mislabelled card/proxy); the day's 10th percentile is used instead.
    SUSPICIOUS_LOW_RATIO: float = 0.3

    # Buy/wait signal (scoring.market_signal): last SIGNAL_WINDOW_DAYS completed
    # days vs. the days before, needing SIGNAL_MIN_DAYS of history and at least
    # SIGNAL_MIN_PERIOD_DAYS on each side. A trend counts from these changes (%).
    SIGNAL_MIN_DAYS: int = 14
    SIGNAL_WINDOW_DAYS: int = 7
    SIGNAL_MIN_PERIOD_DAYS: int = 5
    SIGNAL_PRICE_PCT: float = 5.0
    SIGNAL_SUPPLY_PCT: float = 10.0

    # Currency conversion to EUR. Rows in other currencies are skipped.
    CURRENCY_RATES: Dict[str, float] = {
        'EUR': 1.0,
        'USD': 0.92,  # Update with real rates
        'GBP': 1.17,
        'CHF': 1.06,
        'PLN': 0.23,
    }

    # Deal score weights (sum = 1.0)
    WEIGHT_PRICE_DEVIATION: float = 0.4
    WEIGHT_VOLUME_TREND: float = 0.3
    WEIGHT_LIQUIDITY: float = 0.2
    WEIGHT_POPULARITY: float = 0.1

    # Current cheapest listing this far below the usual floor (%) scores 100 on price
    PRICE_DEVIATION_FULL_SCORE_PCT: float = 30.0

    # Liquidity: average listing observations per observed day. Each scrape
    # stores every active listing, and there are two scrapes a day, so 60
    # observations/day is roughly 30 listings on the market.
    HIGH_LIQUIDITY_DAILY: float = 60.0
    MED_LIQUIDITY_DAILY: float = 20.0
    LOW_LIQUIDITY_DAILY: float = 6.0

    # Set popularity: case-insensitive substring match on the set name
    # (CardTrader names look like "Scarlet & Violet—151"), first match wins.
    POPULAR_SETS: Dict[str, float] = {
        'Prismatic Evolutions': 100.0,
        '151': 95.0,
        'Evolving Skies': 95.0,
        'Base Set': 95.0,
        'Hidden Fates': 90.0,
        'Shining Fates': 85.0,
        'Paldean Fates': 90.0,
        'Crown Zenith': 85.0,
        'Surging Sparks': 85.0,
        'Destined Rivals': 85.0,
        'Journey Together': 80.0,
        'Obsidian Flames': 80.0,
        'Paradox Rift': 75.0,
        'Lost Origin': 75.0,
        'Silver Tempest': 75.0,
    }
    DEFAULT_POPULARITY: float = 50.0

    # Storage. Every scrape stores every listing again (~340k rows, twice a
    # day, a few hundred MB per day incl. indexes), so raw_prices only keeps a
    # few days; the history lives in daily_prices (one row per product per
    # day, a few thousand rows / under 1 MB per day).
    RAW_PRICES_RETENTION_DAYS: int = 3
    RAW_PRICES_PRUNE_BATCH_ROWS: int = 40000
    RAW_PRICES_PRUNE_MAX_BATCHES_PER_RUN: int = 25
    # Never below LONG_WINDOW_DAYS + 1 (enforced when pruning)
    DAILY_PRICES_RETENTION_DAYS: int = 180
    # Log a warning when the whole database grows past this (Railway volume is 5 GB)
    DB_SIZE_WARN_GB: float = 3.5

    LOG_LEVEL: str = "INFO"


# Singleton instance
analysis_config = AnalysisConfig()
