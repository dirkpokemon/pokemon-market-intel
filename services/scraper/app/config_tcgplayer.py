"""
TCGPlayer Scraper Configuration
Major US marketplace with EU shipping options
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class TCGPlayerScraperConfig(BaseSettings):
    """TCGPlayer scraper settings"""
    
    # Base URL
    BASE_URL: str = "https://www.tcgplayer.com"
    
    # API Configuration (TCGPlayer has a Partner API)
    API_BASE_URL: str = "https://api.tcgplayer.com"
    API_PUBLIC_KEY: str = ""  # Get from tcgplayer.com/partner
    API_PRIVATE_KEY: str = ""
    USE_API: bool = False  # Set to True if you have API credentials
    
    # Target Game
    GAME_NAME: str = "pokemon"
    
    # Search Parameters
    SEARCH_CATEGORIES: list[str] = [
        "Pokemon Singles",
        "Pokemon Sealed Products",
        "Booster Boxes",
        "Elite Trainer Boxes",
    ]
    
    # Popular Sets to Scrape (can expand this list)
    TARGET_SETS: list[str] = [
        "Scarlet & Violet",
        "Paldea Evolved",
        "Obsidian Flames",
        "151",
        "Paradox Rift",
        "Temporal Forces",
        "Twilight Masquerade",
        "Shrouded Fable",
        "Stellar Crown",
        "Surging Sparks",
    ]
    
    # Filters
    MIN_PRICE_USD: float = 1.0
    MAX_PRICE_USD: float = 10000.0
    
    # Only include listings that ship internationally
    INTERNATIONAL_SHIPPING: bool = True
    
    # Condition Filters
    CONDITIONS: list[str] = [
        "Near Mint",
        "Lightly Played",
        "Moderately Played",
        "Heavily Played",
        "Damaged",
    ]
    
    # Rate Limiting (TCGPlayer is strict about scraping)
    REQUESTS_PER_MINUTE: int = 20
    MIN_DELAY_SECONDS: float = 2.0
    MAX_DELAY_SECONDS: float = 5.0
    
    # Retry Configuration
    MAX_RETRIES: int = 3
    RETRY_DELAY_SECONDS: int = 5
    
    # User Agents
    USER_AGENTS: list[str] = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0",
    ]
    
    # Pagination
    ITEMS_PER_PAGE: int = 50
    MAX_PAGES_PER_SEARCH: int = 3
    
    # Currency Conversion
    DEFAULT_CURRENCY: str = "USD"
    
    # Output
    OUTPUT_TO_DATABASE: bool = True
    LOG_LEVEL: str = "INFO"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"  # Ignore extra fields from .env
    )


config = TCGPlayerScraperConfig()
