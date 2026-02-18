#!/usr/bin/env python3
"""
TCGPlayer Scraper Entry Point
Run this script to scrape Pokemon listings from TCGPlayer.com

Usage:
    python run_tcgplayer.py
    
Or via Docker:
    docker compose exec scraper python run_tcgplayer.py
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import AsyncSessionLocal
from app.scrapers.tcgplayer_scraper import run_tcgplayer_scraper
from app.config_tcgplayer import config


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
    logger.info("TCGPlayer Scraper")
    logger.info("US marketplace with international shipping")
    logger.info("=" * 60)
    
    if config.USE_API and not config.API_PUBLIC_KEY:
        logger.warning("API mode enabled but no API credentials provided!")
        logger.warning("Get access from: https://www.tcgplayer.com/partner")
        logger.warning("Falling back to web scraping...")
    
    async with AsyncSessionLocal() as session:
        try:
            count = await run_tcgplayer_scraper(session)
            
            logger.info("=" * 60)
            logger.info("TCGPlayer scraper completed successfully")
            logger.info(f"Total listings scraped: {count}")
            logger.info("=" * 60)
            
            sys.exit(0)
            
        except Exception as e:
            logger.error(f"Fatal error: {e}", exc_info=True)
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
