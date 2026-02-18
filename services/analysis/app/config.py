"""
Analysis Service Configuration
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Analysis settings loaded from environment variables
    """

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    # Application
    APP_VERSION: str = "1.0.0"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str

    # Scheduling
    ANALYSIS_SCHEDULE: str = "0 * * * *"  # Every hour
    DEAL_SCORE_SCHEDULE: str = "*/30 * * * *"  # Every 30 minutes
    SIGNAL_SCHEDULE: str = "*/15 * * * *"  # Every 15 minutes

    # Analysis Parameters
    LOOKBACK_DAYS: int = 30  # Days of historical data to analyze
    MIN_DATA_POINTS: int = 10  # Minimum data points required for analysis
    OUTLIER_THRESHOLD: float = 3.0  # Standard deviations for outlier detection

    # Deal Score Weights
    WEIGHT_PRICE_VS_AVG: float = 0.4
    WEIGHT_PRICE_TREND: float = 0.3
    WEIGHT_AVAILABILITY: float = 0.2
    WEIGHT_SELLER_RATING: float = 0.1

    # Signal Detection
    PRICE_DROP_THRESHOLD: float = 0.15  # 15% drop
    PRICE_SPIKE_THRESHOLD: float = 0.25  # 25% increase
    VOLATILITY_THRESHOLD: float = 0.20  # 20% volatility

    # Performance
    BATCH_SIZE: int = 1000
    PARALLEL_WORKERS: int = 4

    # Storage
    EXPORT_ENABLED: bool = False
    EXPORT_PATH: str = "/app/data/exports"


settings = Settings()
