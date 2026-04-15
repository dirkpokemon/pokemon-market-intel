"""
Analysis Service Entry Point
"""

import asyncio
import logging
import os
import signal
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import settings
from app.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class _HealthHandler(BaseHTTPRequestHandler):
    """Minimal handler so Railway (and similar) health checks on $PORT succeed."""

    def do_GET(self) -> None:  # noqa: N802
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"ok")

    def log_message(self, fmt: str, *args: Any) -> None:  # noqa: A003
        pass


def start_health_server_thread() -> None:
    port_s = os.environ.get("PORT", "8080")
    try:
        port = int(port_s)
    except ValueError:
        port = 8080

    def serve() -> None:
        try:
            server = HTTPServer(("0.0.0.0", port), _HealthHandler)
            logger.info(f"Health check HTTP listening on 0.0.0.0:{port}")
            server.serve_forever()
        except OSError as e:
            logger.error(f"Could not bind health server on port {port}: {e}")

    thread = threading.Thread(target=serve, name="health-http", daemon=True)
    thread.start()


class AnalysisService:
    """
    Main analysis service orchestrator
    """

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.running = False
        self._pipeline_lock = asyncio.Lock()

    async def start(self):
        """
        Start the analysis service
        """
        logger.info(f"Starting TCG Pulse Analysis Service v{settings.APP_VERSION}")
        logger.info(f"Analysis schedule: {settings.ANALYSIS_SCHEDULE}")
        
        # Initialize database (creates tables if they don't exist)
        await init_db()
        
        # Schedule analysis jobs
        self.scheduler.add_job(
            self.run_full_analysis,
            CronTrigger.from_crontab('0 * * * *'),
            id='full_analysis',
            name='Full Analysis Pipeline',
            max_instances=1,
        )

        self.scheduler.start()
        self.running = True

        logger.info("Analysis service started successfully")
        # Long-running pipeline: do not block startup (Railway health / scheduler must be "up" first)
        logger.info("Scheduling initial full analysis in background...")
        asyncio.create_task(self._run_initial_analysis_safe())
        logger.info("Next analysis scheduled at the top of the next hour")
        
        try:
            while self.running:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            pass

    async def _run_initial_analysis_safe(self) -> None:
        try:
            await self.run_full_analysis()
        except Exception as e:
            logger.error(f"Initial analysis failed: {e}", exc_info=True)

    async def stop(self):
        """
        Stop the analysis service
        """
        logger.info("Stopping analysis service...")
        self.running = False
        self.scheduler.shutdown()
        logger.info("Analysis service stopped")

    async def run_full_analysis(self):
        """
        Run the complete analysis pipeline: stats -> deal scores -> signals
        """
        async with self._pipeline_lock:
            await self._run_full_analysis_locked()

    async def _run_full_analysis_locked(self):
        logger.info("=" * 60)
        logger.info("Starting full analysis pipeline")
        logger.info("=" * 60)

        try:
            from app.raw_prices_retention import prune_raw_prices_older_than_retention

            pruned = await prune_raw_prices_older_than_retention()
            if pruned:
                logger.info(f"Retention step removed {pruned} old raw_prices rows")
        except Exception as e:
            logger.error(f"raw_prices retention step failed (continuing pipeline): {e}", exc_info=True)

        # Step 1: Market statistics
        stats_count = await self.calculate_market_stats()
        
        # Step 2: Deal scores (depends on market stats)
        deal_count = 0
        if stats_count > 0:
            deal_count = await self.calculate_deal_scores()
        
        # Step 3: Signals (reads MarketStats only; deal scores feed Top Deals, not this gate)
        signal_count = 0
        if stats_count > 0:
            signal_count = await self.detect_signals()
        
        logger.info("=" * 60)
        logger.info(f"Analysis complete: {stats_count} stats, {deal_count} deals, {signal_count} signals")
        logger.info("=" * 60)

    async def calculate_market_stats(self) -> int:
        """
        Calculate market-wide statistics
        """
        logger.info("Calculating market statistics...")
        try:
            from app.calculators.market_stats_calculator import MarketStatsCalculator
            calculator = MarketStatsCalculator()
            count = await calculator.calculate_all()
            logger.info(f"Market statistics calculated: {count} products")
            return count
        except Exception as e:
            logger.error(f"Market stats calculation failed: {e}", exc_info=True)
            return 0

    async def calculate_deal_scores(self) -> int:
        """
        Calculate deal scores for all products
        """
        logger.info("Calculating deal scores...")
        try:
            from app.calculators.deal_score_calculator import DealScoreCalculator
            calculator = DealScoreCalculator()
            count = await calculator.calculate_all()
            logger.info(f"Deal scores calculated: {count} products")
            return count
        except Exception as e:
            logger.error(f"Deal score calculation failed: {e}", exc_info=True)
            return 0

    async def detect_signals(self) -> int:
        """
        Detect price signals and alerts
        """
        logger.info("Detecting signals...")
        try:
            from app.generators.signal_generator import SignalGenerator
            generator = SignalGenerator()
            count = await generator.generate_all()
            logger.info(f"Signals detected: {count}")
            return count
        except Exception as e:
            logger.error(f"Signal detection failed: {e}", exc_info=True)
            return 0


async def main():
    """
    Main entry point
    """
    start_health_server_thread()
    service = AnalysisService()
    
    # Handle shutdown signals
    def signal_handler(signum: int, frame: Any) -> None:
        print(f"\nReceived signal {signum}")
        asyncio.create_task(service.stop())
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        await service.start()
    except KeyboardInterrupt:
        pass
    finally:
        await service.stop()


if __name__ == "__main__":
    asyncio.run(main())
