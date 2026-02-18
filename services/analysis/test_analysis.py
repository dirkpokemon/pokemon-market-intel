#!/usr/bin/env python3
"""
Quick test script for the analysis engine
Tests if the analysis pipeline can run without errors
"""

import asyncio
import logging
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_database():
    """Test database connection and models"""
    logger.info("Testing database connection...")
    from app.database import init_db, get_session
    from app.models import MarketStats, DealScore, Signal, RawPrice
    
    await init_db()
    logger.info("✓ Database initialized")
    
    async with get_session() as session:
        # Test query
        from sqlalchemy import select
        result = await session.execute(select(RawPrice).limit(1))
        raw_prices = result.scalars().all()
        logger.info(f"✓ Found {len(raw_prices)} raw price records")
    
    logger.info("✓ Database test passed")


async def test_normalizer():
    """Test data normalizer"""
    logger.info("Testing data normalizer...")
    from app.normalizers.data_normalizer import DataNormalizer
    
    normalizer = DataNormalizer()
    
    # Test currency conversion
    eur_price = normalizer.normalize_price(100, 'USD')
    logger.info(f"✓ USD to EUR: $100 = €{eur_price}")
    
    # Test condition normalization
    condition = normalizer.normalize_condition('Near Mint')
    logger.info(f"✓ Condition: 'Near Mint' → '{condition}'")
    
    # Test product name
    name = normalizer.normalize_product_name('  pikachu   vmax  ')
    logger.info(f"✓ Product name: '  pikachu   vmax  ' → '{name}'")
    
    logger.info("✓ Normalizer test passed")


async def test_market_stats():
    """Test market stats calculator"""
    logger.info("Testing market stats calculator...")
    from app.calculators.market_stats_calculator import MarketStatsCalculator
    
    calculator = MarketStatsCalculator()
    count = await calculator.calculate_all()
    logger.info(f"✓ Calculated {count} market statistics")
    
    if count > 0:
        logger.info("✓ Market stats calculator test passed")
    else:
        logger.warning("⚠ No market stats generated (no raw price data?)")


async def test_deal_scores():
    """Test deal score calculator"""
    logger.info("Testing deal score calculator...")
    from app.calculators.deal_score_calculator import DealScoreCalculator
    
    calculator = DealScoreCalculator()
    count = await calculator.calculate_all()
    logger.info(f"✓ Calculated {count} deal scores")
    
    if count > 0:
        logger.info("✓ Deal score calculator test passed")
    else:
        logger.warning("⚠ No deal scores generated (no market stats?)")


async def test_signals():
    """Test signal generator"""
    logger.info("Testing signal generator...")
    from app.generators.signal_generator import SignalGenerator
    
    generator = SignalGenerator()
    count = await generator.generate_all()
    logger.info(f"✓ Generated {count} signals")
    
    if count > 0:
        logger.info("✓ Signal generator test passed")
    else:
        logger.warning("⚠ No signals generated (no deal scores?)")


async def main():
    """Run all tests"""
    logger.info("=" * 60)
    logger.info("Analysis Engine Test Suite")
    logger.info("=" * 60)
    
    try:
        await test_database()
        print()
        
        await test_normalizer()
        print()
        
        await test_market_stats()
        print()
        
        await test_deal_scores()
        print()
        
        await test_signals()
        print()
        
        logger.info("=" * 60)
        logger.info("✅ All tests completed successfully!")
        logger.info("=" * 60)
        
        return 0
        
    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
