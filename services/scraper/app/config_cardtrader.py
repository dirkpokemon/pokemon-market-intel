"""
CardTrader Scraper Configuration
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class CardTraderScraperConfig(BaseSettings):
    """
    Configuration for CardTrader scraper
    """

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    # Database
    DATABASE_URL: str

    # API Configuration (CardTrader has a public API)
    API_BASE_URL: str = "https://api.cardtrader.com/api/v2"
    CARDTRADER_API_TOKEN: str = ""  # Get from cardtrader.com/account/api
    CARDTRADER_USE_API: bool = True  # Set to False to use web scraping instead

    # Scraper Settings (Optimized for Production)
    MAX_EXPANSIONS: int = 100  # Process most recent 100 expansions
    MAX_BLUEPRINTS_PER_EXPANSION: int = 0  # 0 = no limit, process all
    
    # Rate Limiting (Optimized)
    MIN_DELAY_SECONDS: float = 0.3  # Faster but still respectful
    MAX_DELAY_SECONDS: float = 0.5
    REQUEST_TIMEOUT: int = 30

    # Logging
    LOG_LEVEL: str = "INFO"

    # Proxy (if needed)
    PROXY_ENABLED: bool = False
    PROXY_LIST: List[str] = []

    # User Agents (basic, API doesn't need rotation)
    USER_AGENTS: List[str] = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    ]


config = CardTraderScraperConfig()
