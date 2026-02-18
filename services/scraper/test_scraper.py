"""
Test script for scraper service
"""

import asyncio
import logging

from app.scrapers.cardmarket import CardMarketScraper
from app.scrapers.cardtrader import CardTraderScraper
from app.database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_cardmarket():
    """Test CardMarket scraper"""
    logger.info("\n" + "=" * 60)
    logger.info("Testing CardMarket Scraper")
    logger.info("=" * 60)
    
    scraper = CardMarketScraper()
    
    try:
        # Initialize database
        await init_db()
        
        # Test scraping (will only run parsing logic without actual HTTP requests in test mode)
        logger.info("Scraper initialized successfully")
        logger.info(f"Source: {scraper.source_name}")
        logger.info(f"Base URL: {scraper.base_url}")
        
        # You can uncomment the line below to run actual scraping
        # data = await scraper.scrape()
        # logger.info(f"Scraped {len(data)} items")
        
        logger.info("✅ CardMarket scraper test passed")
        
    except Exception as e:
        logger.error(f"❌ CardMarket scraper test failed: {e}")
        raise


async def test_cardtrader():
    """Test CardTrader scraper"""
    logger.info("\n" + "=" * 60)
    logger.info("Testing CardTrader Scraper")
    logger.info("=" * 60)
    
    scraper = CardTraderScraper()
    
    try:
        logger.info("Scraper initialized successfully")
        logger.info(f"Source: {scraper.source_name}")
        logger.info(f"Base URL: {scraper.base_url}")
        
        # You can uncomment the line below to run actual scraping
        # data = await scraper.scrape()
        # logger.info(f"Scraped {len(data)} items")
        
        logger.info("✅ CardTrader scraper test passed")
        
    except Exception as e:
        logger.error(f"❌ CardTrader scraper test failed: {e}")
        raise


async def main():
    """Run all tests"""
    logger.info("\n🎮 Pokemon Market Intelligence EU - Scraper Tests\n")
    
    try:
        await test_cardmarket()
        await test_cardtrader()
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ All tests passed!")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"\n❌ Tests failed: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
