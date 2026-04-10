"""
Database Configuration for Analysis Service
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.config import settings

# Railway provides postgresql:// or postgres:// — convert to asyncpg driver
def _make_async_url(url: str) -> str:
    url = url.replace("postgres://", "postgresql://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url

# Create async engine
engine = create_async_engine(
    _make_async_url(settings.DATABASE_URL),
    pool_size=10,
    max_overflow=5,
    echo=False,
    future=True,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()


async def init_db() -> None:
    """
    Initialize database connection and create tables.
    Also runs safe ALTER TABLE migrations for any missing columns.
    """
    async with engine.begin() as conn:
        # Import all models to ensure they're registered
        from app import models
        # Create tables that don't exist yet
        await conn.run_sync(Base.metadata.create_all)
        # Safely add any columns that might be missing from older deployments
        await conn.run_sync(_migrate_columns)


def _migrate_columns(connection) -> None:
    """
    Add missing columns to existing tables using ADD COLUMN IF NOT EXISTS.
    Safe to run multiple times — no-ops if columns already exist.
    """
    migrations = [
        # market_statistics: columns added after initial schema
        "ALTER TABLE market_statistics ADD COLUMN IF NOT EXISTS min_price_7d NUMERIC(10,2)",
        "ALTER TABLE market_statistics ADD COLUMN IF NOT EXISTS max_price_7d NUMERIC(10,2)",
        "ALTER TABLE market_statistics ADD COLUMN IF NOT EXISTS min_price_30d NUMERIC(10,2)",
        "ALTER TABLE market_statistics ADD COLUMN IF NOT EXISTS max_price_30d NUMERIC(10,2)",
        "ALTER TABLE market_statistics ADD COLUMN IF NOT EXISTS price_trend_7d NUMERIC(5,2)",
        "ALTER TABLE market_statistics ADD COLUMN IF NOT EXISTS price_trend_30d NUMERIC(5,2)",
        "ALTER TABLE market_statistics ADD COLUMN IF NOT EXISTS volume_trend_7d NUMERIC(5,2)",
        "ALTER TABLE market_statistics ADD COLUMN IF NOT EXISTS volume_trend_30d NUMERIC(5,2)",
        "ALTER TABLE market_statistics ADD COLUMN IF NOT EXISTS liquidity_score NUMERIC(5,2)",
        "ALTER TABLE market_statistics ADD COLUMN IF NOT EXISTS volatility NUMERIC(5,2)",
        "ALTER TABLE market_statistics ADD COLUMN IF NOT EXISTS sample_size INTEGER",
        "ALTER TABLE market_statistics ADD COLUMN IF NOT EXISTS data_quality VARCHAR(20)",
        "ALTER TABLE market_statistics ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ DEFAULT NOW()",
    ]
    for sql in migrations:
        try:
            connection.execute(__import__('sqlalchemy').text(sql))
        except Exception:
            pass  # Column likely already exists under a different error path


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Get database session (for FastAPI dependency injection)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Get database session (for general use)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
