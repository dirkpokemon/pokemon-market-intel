#!/usr/bin/env python3
"""
eBay Scraper Entry Point
Run this script via cron or manually to scrape sold Pokemon listings from eBay

Usage:
    python run_ebay.py
    
Or via Docker:
    docker compose exec scraper python run_ebay.py
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import AsyncSessionLocal
from app.scrapers.ebay_scraper import run_ebay_scraper
from app.config_ebay import config


# Configure logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)


async def main():
    """Main execution"""
    logger.info("=" * 60)
    logger.info("eBay Sold Listings Scraper")
    logger.info("Collecting REAL market data from completed sales")
    logger.info("=" * 60)
    
    async with AsyncSessionLocal() as session:
        try:
            stats = await run_ebay_scraper(session)
            
            logger.info("=" * 60)
            logger.info("eBay scraper completed successfully")
            logger.info(f"Sites scraped: {len(stats)}")
            logger.info(f"Total listings: {sum(stats.values())}")
            logger.info("=" * 60)
            
            for site, count in stats.items():
                logger.info(f"  {site}: {count} listings")
            
            sys.exit(0)
            
        except Exception as e:
            logger.error(f"Fatal error: {e}", exc_info=True)
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
