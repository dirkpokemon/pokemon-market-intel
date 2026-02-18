"""
CardMarket Scraper Configuration
Production-ready settings for safe, respectful scraping
"""

from typing import List
from pydantic_settings import BaseSettings


class CardMarketConfig(BaseSettings):
    """
    CardMarket-specific configuration
    """
    
    # Base URLs
    BASE_URL: str = "https://www.cardmarket.com"
    POKEMON_BASE: str = "https://www.cardmarket.com/en/Pokemon"
    
    # Rate Limiting (be respectful!)
    MIN_DELAY_SECONDS: float = 2.0  # Minimum delay between requests
    MAX_DELAY_SECONDS: float = 5.0  # Maximum delay for randomization
    REQUESTS_PER_MINUTE: int = 20   # Conservative rate limit
    
    # Request Configuration
    TIMEOUT_SECONDS: int = 30
    MAX_RETRIES: int = 3
    RETRY_BACKOFF_FACTOR: float = 2.0
    
    # User-Agent Rotation (real browser agents)
    USER_AGENTS: List[str] = [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ]
    
    # Scraping Scope
    MAX_PAGES_PER_SET: int = 10  # Limit pages to scrape per set
    MAX_SETS_PER_RUN: int = 5    # Limit sets per scrape run
    
    # Pokemon Sets to Scrape (expansions)
    PRIORITY_SETS: List[str] = [
        "Base-Set",
        "Jungle",
        "Fossil",
        "Scarlet-Violet-151",
        "Paldean-Fates",
        "Obsidian-Flames",
        "Paradox-Rift",
        "Temporal-Forces",
        "Twilight-Masquerade",
        "Shrouded-Fable"
    ]
    
    # Product Categories
    SCRAPE_SINGLES: bool = True
    SCRAPE_SEALED: bool = True
    
    # Data Quality
    MIN_PRICE: float = 0.01  # Minimum valid price (EUR)
    MAX_PRICE: float = 10000.0  # Maximum reasonable price (EUR)
    
    # Proxy Configuration
    USE_PROXY: bool = False
    PROXY_URL: str = ""
    PROXY_COUNTRY: str = "DE"  # Germany for EU
    
    class Config:
        env_prefix = "CARDMARKET_"


# Singleton instance
cardmarket_config = CardMarketConfig()
