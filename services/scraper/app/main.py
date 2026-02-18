"""
Scraper Service Entry Point
"""

import asyncio
import signal
import sys
import logging
from typing import Any
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.config import settings
from app.database import init_db, AsyncSessionLocal
from app.scrapers.cardmarket import CardMarketScraper
from app.scrapers.cardtrader import CardTraderScraper
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
        self.scrapers = []
        
        # Initialize scrapers based on config
        if settings.CARDMARKET_ENABLED:
            self.scrapers.append(CardMarketScraper())
            logger.info("CardMarket scraper enabled")
        
        if settings.CARDTRADER_ENABLED:
            self.scrapers.append(CardTraderScraper())
            logger.info("CardTrader scraper enabled")

    async def start(self):
        """
        Start the scraper service
        """
        logger.info(f"Starting Pokemon Intel EU Scraper v{settings.APP_VERSION}")
        logger.info(f"Scrape interval: {settings.SCRAPE_INTERVAL} minutes")
        logger.info(f"Enabled scrapers: {len(self.scrapers)}")
        
        # Initialize database
        await init_db()
        
        # Schedule scraping jobs
        self.scheduler.add_job(
            self.run_scrape_cycle,
            IntervalTrigger(minutes=settings.SCRAPE_INTERVAL),
            id='scrape_cycle',
            name='Pokemon Card Price Scraping',
            max_instances=1,  # Prevent concurrent runs
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
        
        # Keep running
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
        self.scheduler.shutdown(wait=False)
        logger.info("Scraper service stopped")

    async def run_scrape_cycle(self):
        """
        Run a complete scraping cycle for all configured sources
        """
        logger.info("=" * 60)
        logger.info("Starting scrape cycle...")
        logger.info("=" * 60)
        
        cycle_start = datetime.utcnow()
        total_scraped = 0
        
        for scraper in self.scrapers:
            try:
                await self.run_scraper(scraper)
                total_scraped += 1
            except Exception as e:
                logger.error(f"Error in {scraper.__class__.__name__}: {e}")
                continue
        
        cycle_duration = (datetime.utcnow() - cycle_start).total_seconds()
        
        logger.info("=" * 60)
        logger.info(f"Scrape cycle completed in {cycle_duration:.2f}s")
        logger.info(f"Scrapers run: {total_scraped}/{len(self.scrapers)}")
        logger.info("=" * 60)

    async def run_scraper(self, scraper):
        """
        Run a single scraper and log results
        """
        scraper_name = scraper.__class__.__name__
        logger.info(f"\n--- Running {scraper_name} ---")
        
        started_at = datetime.utcnow()
        status = "success"
        items_scraped = 0
        errors_count = 0
        error_message = None
        
        try:
            # Run the scraper
            data = await scraper.scrape()
            items_scraped = len(data) if data else 0
            
            logger.info(f"✅ {scraper_name} completed: {items_scraped} items")
            
        except Exception as e:
            status = "failed"
            errors_count = 1
            error_message = str(e)
            logger.error(f"❌ {scraper_name} failed: {e}")
        
        finally:
            # Log to database
            completed_at = datetime.utcnow()
            duration = int((completed_at - started_at).total_seconds())
            
            await self.log_scrape_session(
                source=scraper.source_name,
                status=status,
                items_scraped=items_scraped,
                errors_count=errors_count,
                started_at=started_at,
                completed_at=completed_at,
                duration_seconds=duration,
                error_message=error_message
            )

    async def log_scrape_session(
        self,
        source: str,
        status: str,
        items_scraped: int,
        errors_count: int,
        started_at: datetime,
        completed_at: datetime,
        duration_seconds: int,
        error_message: str = None
    ):
        """
        Log scraping session to database
        """
        async with AsyncSessionLocal() as session:
            try:
                log = ScrapeLog(
                    source=source,
                    status=status,
                    items_scraped=items_scraped,
                    errors_count=errors_count,
                    started_at=started_at,
                    completed_at=completed_at,
                    duration_seconds=duration_seconds,
                    error_message=error_message
                )
                session.add(log)
                await session.commit()
            except Exception as e:
                logger.error(f"Error logging scrape session: {e}")
                await session.rollback()


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
