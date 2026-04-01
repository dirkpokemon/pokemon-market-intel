#!/usr/bin/env python3
"""
Analysis Engine - Standalone Entry Point

Runs the complete analysis pipeline:
1. Calculate market statistics from raw prices
2. Calculate deal scores
3. Generate signals/alerts

This script is cron-ready and can be run standalone:
    python run_analysis.py

Or with Docker:
    docker compose exec analysis python run_analysis.py

Cron example (every 2 hours):
    0 */2 * * * cd /path/to/project && docker compose exec -T analysis python run_analysis.py >> /var/log/analysis.log 2>&1
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
        logging.FileHandler('/tmp/analysis.log')
    ]
)

logger = logging.getLogger(__name__)


async def main():
    """
    Main entry point for analysis engine
    """
    start_time = datetime.now()
    logger.info("=" * 80)
    logger.info("Pokemon Market Intelligence - Analysis Engine")
    logger.info(f"Start time: {start_time}")
    logger.info("=" * 80)
    
    try:
        # Import here to ensure app context is ready
        from app.database import init_db
        from app.calculators.market_stats_calculator import MarketStatsCalculator
        from app.calculators.deal_score_calculator import DealScoreCalculator
        from app.generators.signal_generator import SignalGenerator
        
        # Initialize database
        await init_db()
        logger.info("✓ Database initialized")
        
        # Step 1: Calculate market statistics
        logger.info("\n" + "=" * 80)
        logger.info("STEP 1: Calculating Market Statistics")
        logger.info("=" * 80)
        stats_calculator = MarketStatsCalculator()
        stats_count = await stats_calculator.calculate_all()
        logger.info(f"✓ Calculated {stats_count} market statistics")
        
        # Step 2: Calculate deal scores
        logger.info("\n" + "=" * 80)
        logger.info("STEP 2: Calculating Deal Scores")
        logger.info("=" * 80)
        deal_calculator = DealScoreCalculator()
        deals_count = await deal_calculator.calculate_all()
        logger.info(f"✓ Calculated {deals_count} deal scores")
        
        # Step 3: Generate signals
        logger.info("\n" + "=" * 80)
        logger.info("STEP 3: Generating Signals")
        logger.info("=" * 80)
        signal_generator = SignalGenerator()
        signals_count = await signal_generator.generate_all()
        logger.info(f"✓ Generated {signals_count} signals")
        
        # Summary
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        logger.info("\n" + "=" * 80)
        logger.info("ANALYSIS COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Duration: {duration:.2f}s")
        logger.info(f"Market Stats: {stats_count}")
        logger.info(f"Deal Scores: {deals_count}")
        logger.info(f"Signals: {signals_count}")
        logger.info("=" * 80)
        
        return 0  # Success
        
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        return 1  # Failure


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
