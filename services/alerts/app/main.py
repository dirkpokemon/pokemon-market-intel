"""
Alert Engine Main Entry Point
Runs on a schedule (every 5 minutes) to process and send alerts
"""

import logging
import sys
import asyncio
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from app.config import settings
from app.database import AsyncSessionLocal
from app.alert_engine import AlertEngine


# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


async def process_immediate_alerts():
    """
    Job to process high-priority immediate alerts
    Runs every CHECK_INTERVAL_MINUTES minutes
    """
    logger.info("=" * 60)
    logger.info("Starting immediate alert processing job")
    logger.info("=" * 60)
    
    async with AsyncSessionLocal() as db:
        try:
            engine = AlertEngine(db)
            stats = await engine.process_high_priority_alerts()
            
            logger.info(f"✅ Immediate alerts processed: {stats}")
            
        except Exception as e:
            logger.error(f"❌ Error processing immediate alerts: {e}", exc_info=True)
            await db.rollback()


async def process_daily_digest():
    """
    Job to compile and send daily digest
    Runs once per day at DIGEST_SEND_HOUR (UTC)
    """
    logger.info("=" * 60)
    logger.info("Starting daily digest job")
    logger.info("=" * 60)
    
    async with AsyncSessionLocal() as db:
        try:
            engine = AlertEngine(db)
            stats = await engine.process_daily_digest()
            
            logger.info(f"✅ Daily digest processed: {stats}")
            
        except Exception as e:
            logger.error(f"❌ Error processing daily digest: {e}", exc_info=True)
            await db.rollback()


async def run_once_and_exit():
    """
    Run both jobs once and exit (for manual/cron execution)
    """
    logger.info("Running in ONCE mode (manual execution)")
    
    # Process immediate alerts
    await process_immediate_alerts()
    
    # Process daily digest if enabled
    if settings.MEDIUM_PRIORITY_DIGEST:
        await process_daily_digest()
    
    logger.info("ONCE mode complete, exiting")


def run_scheduler():
    """
    Run the alert engine with APScheduler for continuous operation
    """
    if not settings.ALERT_ENGINE_ENABLED:
        logger.warning("Alert engine is DISABLED in configuration")
        return
    
    logger.info("🚀 Starting Alert Engine with APScheduler")
    logger.info(f"Configuration:")
    logger.info(f"  - Check interval: {settings.CHECK_INTERVAL_MINUTES} minutes")
    logger.info(f"  - Daily digest: {'enabled' if settings.MEDIUM_PRIORITY_DIGEST else 'disabled'}")
    logger.info(f"  - Digest send hour: {settings.DIGEST_SEND_HOUR}:00 UTC")
    logger.info(f"  - Email provider: {settings.EMAIL_PROVIDER}")
    logger.info(f"  - Telegram: {'enabled' if settings.TELEGRAM_ENABLED else 'disabled'}")
    logger.info(f"  - Dry run: {'YES' if settings.DRY_RUN else 'NO'}")
    
    if settings.DRY_RUN:
        logger.warning("⚠️  DRY RUN MODE - Alerts will be logged but not actually sent")
    
    # Create scheduler
    scheduler = AsyncIOScheduler()
    
    # Schedule immediate alerts (every N minutes)
    if settings.HIGH_PRIORITY_IMMEDIATE:
        scheduler.add_job(
            process_immediate_alerts,
            trigger=IntervalTrigger(minutes=settings.CHECK_INTERVAL_MINUTES),
            id="immediate_alerts",
            name="Process Immediate High-Priority Alerts",
            replace_existing=True,
            max_instances=1  # Prevent overlapping runs
        )
        logger.info(f"✅ Scheduled immediate alerts every {settings.CHECK_INTERVAL_MINUTES} minutes")
    
    # Schedule daily digest (once per day)
    if settings.MEDIUM_PRIORITY_DIGEST:
        scheduler.add_job(
            process_daily_digest,
            trigger=CronTrigger(hour=settings.DIGEST_SEND_HOUR, minute=0),
            id="daily_digest",
            name="Send Daily Digest",
            replace_existing=True,
            max_instances=1
        )
        logger.info(f"✅ Scheduled daily digest at {settings.DIGEST_SEND_HOUR}:00 UTC")
    
    # Start scheduler
    scheduler.start()
    logger.info("🎯 Alert Engine is now running")
    logger.info("Press Ctrl+C to stop")
    
    try:
        # Keep the main thread alive
        asyncio.get_event_loop().run_forever()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Shutting down Alert Engine...")
        scheduler.shutdown()
        logger.info("Alert Engine stopped")


if __name__ == "__main__":
    import sys
    
    # Check if running in "once" mode (for cron)
    if len(sys.argv) > 1 and sys.argv[1] == "--once":
        asyncio.run(run_once_and_exit())
    else:
        # Run with scheduler (continuous operation)
        run_scheduler()
