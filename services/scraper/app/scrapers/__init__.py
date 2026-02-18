"""
Scraper Implementations

Available scrapers:
- CardMarketScraper: Largest European trading card marketplace
- CardTraderScraper: Popular international marketplace
"""

from app.scrapers.cardmarket import CardMarketScraper
from app.scrapers.cardtrader import CardTraderScraper

__all__ = ["CardMarketScraper", "CardTraderScraper"]
