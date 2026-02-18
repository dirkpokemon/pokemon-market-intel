#!/usr/bin/env python3
"""
CardTrader Scraper Entry Point
Run this script to scrape Pokemon listings from CardTrader.com

Usage:
    python run_cardtrader.py
    
Or via Docker:
    docker compose exec scraper python run_cardtrader.py
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import AsyncSessionLocal
from app.scrapers.cardtrader_scraper_new import run_cardtrader_scraper
from app.config_cardtrader import config


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
    logger.info("CardTrader Scraper V2 - API-Based")
    logger.info("2nd largest EU Pokemon card marketplace")
    logger.info("=" * 60)
    
    if not config.CARDTRADER_API_TOKEN:
        logger.error("CARDTRADER_API_TOKEN is required!")
        logger.error("Get token from: https://www.cardtrader.com/account/api")
        sys.exit(1)
    
    try:
        count = await run_cardtrader_scraper()
        
        logger.info("=" * 60)
        logger.info("CardTrader scraper completed successfully")
        logger.info(f"Total listings scraped: {count}")
        logger.info("=" * 60)
        
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
