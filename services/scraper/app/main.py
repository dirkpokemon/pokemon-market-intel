"""
Scraper Service Entry Point
"""

import asyncio
import signal
import logging
from typing import Any
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.config import settings
from app.database import init_db, AsyncSessionLocal
from app.scrapers.cardtrader_scraper_new import CardTraderScraperV2
from app.scrapers.cardmarket_api import CardMarketAPIClient
from app.models.scrape_log import ScrapeLog

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ScraperService:
    """
    Main scraper service orchestrator
    """

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.running = False
        self.cardtrader_scraper = CardTraderScraperV2()
        self.cardmarket_scraper = CardMarketAPIClient()
        logger.info("CardTrader API scraper enabled")
        logger.info("CardMarket API scraper enabled")

    async def start(self):
        """
        Start the scraper service
        """
        logger.info(f"Starting TCG Pulse Scraper v{settings.APP_VERSION}")
        logger.info(f"Scrape interval: {settings.SCRAPE_INTERVAL} minutes")
        
        # Initialize database
        await init_db()
        
        # Schedule scraping jobs
        self.scheduler.add_job(
            self.run_scrape_cycle,
            IntervalTrigger(minutes=settings.SCRAPE_INTERVAL),
            id='scrape_cycle',
            name='TCG singles price scraping',
            max_instances=1,
        )

        self.scheduler.add_job(
            self.run_cardmarket_scrape,
            IntervalTrigger(hours=12),
            id='cardmarket_cycle',
            name='CardMarket price guide scraping',
            max_instances=1,
        )
        
        # Run immediately on startup
        logger.info("Running initial scrape...")
        try:
            await self.run_scrape_cycle()
        except Exception as e:
            logger.error(f"Initial scrape failed: {e}")
        
        self.scheduler.start()
        self.running = True
        
        logger.info("Scraper service started successfully")
        logger.info(f"Next scrape scheduled in {settings.SCRAPE_INTERVAL} minutes")
        
        try:
            while self.running:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            pass

    async def stop(self):
        """
        Stop the scraper service
        """
        logger.info("Stopping scraper service...")
        self.running = False
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)
        logger.info("Scraper service stopped")

    async def run_scrape_cycle(self):
        """
        Run a complete scraping cycle using CardTrader API
        """
        logger.info("=" * 60)
        logger.info("Starting scrape cycle (CardTrader API)...")
        logger.info("=" * 60)
        
        cycle_start = datetime.utcnow()
        
        try:
            total = await self.cardtrader_scraper.scrape_all()
            logger.info(f"✅ CardTrader API scrape completed: {total} listings")
        except Exception as e:
            logger.error(f"❌ CardTrader API scrape failed: {e}")

        cycle_duration = (datetime.utcnow() - cycle_start).total_seconds()

        logger.info("=" * 60)
        logger.info(f"Scrape cycle completed in {cycle_duration:.2f}s")
        logger.info("=" * 60)

    async def run_cardmarket_scrape(self):
        """
        Run a standalone CardMarket price guide scrape cycle (every 12 hours).
        """
        logger.info("=" * 60)
        logger.info("Starting CardMarket scrape cycle...")
        logger.info("=" * 60)

        cycle_start = datetime.utcnow()

        try:
            cm_total = await self.cardmarket_scraper.scrape_all()
            logger.info(f"✅ CardMarket API scrape completed: {cm_total} prices")
        except Exception as e:
            logger.error(f"❌ CardMarket scrape failed: {e}")

        cycle_duration = (datetime.utcnow() - cycle_start).total_seconds()

        logger.info("=" * 60)
        logger.info(f"CardMarket scrape cycle completed in {cycle_duration:.2f}s")
        logger.info("=" * 60)


async def main():
    """
    Main entry point
    """
    service = ScraperService()
    
    # Handle shutdown signals
    def signal_handler(signum: int, frame: Any) -> None:
        logger.info(f"\nReceived signal {signum}")
        asyncio.create_task(service.stop())
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        await service.start()
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    finally:
        await service.stop()


if __name__ == "__main__":
    asyncio.run(main())
