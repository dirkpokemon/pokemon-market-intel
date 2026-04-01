#!/usr/bin/env python3
"""
CardMarket Scraper - Standalone Entry Point

This script can be run directly or from cron:
    python run_cardmarket.py

Or with Docker:
    docker compose exec scraper python run_cardmarket.py

Cron example (daily at 3 AM):
    0 3 * * * cd /path/to/project && docker compose exec -T scraper python run_cardmarket.py >> /var/log/cardmarket_scraper.log 2>&1
"""

import asyncio
import logging
import sys
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/tmp/cardmarket_scraper.log')
    ]
)

logger = logging.getLogger(__name__)


async def main():
    """
    Main entry point for CardMarket scraper
    """
    start_time = datetime.now()
    logger.info("=" * 80)
    logger.info("CardMarket Pokemon Scraper - Production Run")
    logger.info(f"Start time: {start_time}")
    logger.info("=" * 80)
    
    try:
        # Import here to ensure app context is ready
        from app.scrapers.cardmarket_production import run_cardmarket_scraper
        from app.database import init_db
        
        # Initialize database
        await init_db()
        logger.info("Database initialized")
        
        # Run scraper
        exit_code = await run_cardmarket_scraper()
        
        # Calculate duration
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        logger.info("=" * 80)
        logger.info(f"Scrape completed in {duration:.2f}s")
        logger.info(f"Exit code: {exit_code}")
        logger.info("=" * 80)
        
        return exit_code
        
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
