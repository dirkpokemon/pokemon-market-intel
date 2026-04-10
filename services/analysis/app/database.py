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
    Drops and recreates market_statistics if its schema is out of date,
    since that table is fully derived from raw_prices.
    """
    from sqlalchemy import text, inspect

    async with engine.begin() as conn:
        # Import all models to ensure they're registered
        from app import models

        # Check if market_statistics has all required columns; if not, drop it
        # so create_all can recreate it with the correct schema.
        required_columns = {
            "avg_price_7d", "min_price_7d", "max_price_7d", "volume_7d",
            "avg_price_30d", "min_price_30d", "max_price_30d", "volume_30d",
            "price_trend_7d", "price_trend_30d", "volume_trend_7d", "volume_trend_30d",
            "liquidity_score", "volatility", "sample_size", "data_quality",
            "calculated_at", "created_at",
        }

        def check_and_drop(sync_conn):
            insp = inspect(sync_conn)
            if insp.has_table("market_statistics"):
                existing = {col["name"] for col in insp.get_columns("market_statistics")}
                if not required_columns.issubset(existing):
                    sync_conn.execute(text("DROP TABLE IF EXISTS market_statistics CASCADE"))

        await conn.run_sync(check_and_drop)
        await conn.run_sync(Base.metadata.create_all)


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
