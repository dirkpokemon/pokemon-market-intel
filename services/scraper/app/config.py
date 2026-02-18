"""
Scraper Configuration
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Scraper settings loaded from environment variables
    """

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    # Application
    APP_VERSION: str = "1.0.0"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str

    # Scraping Configuration
    SCRAPE_INTERVAL: int = 60  # minutes
    SCRAPE_TIMEOUT: int = 30  # seconds
    MAX_RETRIES: int = 3
    RETRY_DELAY: int = 5  # seconds

    # Rate Limiting
    REQUESTS_PER_MINUTE: int = 30
    CONCURRENT_REQUESTS: int = 3

    # Proxy Configuration
    PROXY_ENABLED: bool = False
    PROXY_URL: str = ""
    PROXY_USERNAME: str = ""
    PROXY_PASSWORD: str = ""
    PROXY_COUNTRY: str = "NL"  # Netherlands default for EU

    # Browser Configuration
    HEADLESS: bool = True
    USER_AGENT: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

    # Data Sources (example)
    CARDMARKET_ENABLED: bool = True
    CARDTRADER_ENABLED: bool = True
    TCGPLAYER_EU_ENABLED: bool = False

    # Storage
    BATCH_SIZE: int = 100
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 3600  # seconds


settings = Settings()
