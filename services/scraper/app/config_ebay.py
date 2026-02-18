"""
eBay Scraper Configuration
Scrapes sold listings for real market prices
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class EbayScraperConfig(BaseSettings):
    """eBay scraper settings"""
    
    # eBay API Configuration (optional - can use web scraping without API)
    EBAY_APP_ID: str = ""  # Get from developer.ebay.com
    EBAY_CERT_ID: str = ""
    EBAY_DEV_ID: str = ""
    EBAY_USE_API: bool = False  # Set to True if you have API credentials
    
    # Target eBay Sites (EU focus)
    EBAY_SITES: list[str] = [
        "ebay.de",     # Germany
        "ebay.fr",     # France
        "ebay.co.uk",  # United Kingdom
        "ebay.nl",     # Netherlands
        "ebay.it",     # Italy
        "ebay.es",     # Spain
    ]
    
    # Search Parameters
    SEARCH_KEYWORDS: list[str] = [
        "Pokemon Card",
        "Pokemon TCG",
        "Pokemon Booster Box",
        "Pokemon ETB",
        "Pokemon Singles",
    ]
    
    # Filters
    MIN_PRICE_EUR: float = 5.0      # Minimum listing price
    MAX_PRICE_EUR: float = 5000.0   # Maximum listing price
    DAYS_BACK: int = 30             # How many days of sold listings to fetch
    
    # Only fetch sold/completed listings
    SOLD_LISTINGS_ONLY: bool = True
    
    # Rate Limiting
    REQUESTS_PER_MINUTE: int = 20   # eBay allows ~5000/day
    MIN_DELAY_SECONDS: float = 2.0
    MAX_DELAY_SECONDS: float = 5.0
    
    # Retry Configuration
    MAX_RETRIES: int = 3
    RETRY_DELAY_SECONDS: int = 5
    
    # User Agents
    USER_AGENTS: list[str] = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    ]
    
    # Output
    OUTPUT_TO_DATABASE: bool = True
    LOG_LEVEL: str = "INFO"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"  # Ignore extra fields from .env
    )


config = EbayScraperConfig()
