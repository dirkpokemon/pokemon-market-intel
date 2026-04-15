"""
Database Configuration for Analysis Service
"""

import logging
import ssl
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.config import settings

logger = logging.getLogger(__name__)

# Railway provides postgresql:// or postgres:// — convert to asyncpg driver
def _make_async_url(url: str) -> str:
    url = url.replace("postgres://", "postgresql://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def _connect_args(url: str) -> dict:
    """Match backend SSL handling for Railway proxy URLs."""
    if "proxy.rlwy.net" in url or "railway" in url.lower():
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        logger.info("Railway PostgreSQL detected — SSL enabled (analysis)")
        return {"ssl": ssl_ctx}
    return {}


_db_url = settings.DATABASE_URL
_connect = _connect_args(_db_url)

# Small pool: pipeline is mostly sequential; per-batch streaming sessions must not
# exhaust shared Postgres max_connections (otherwise API login / getMe fail).
engine = create_async_engine(
    _make_async_url(_db_url),
    pool_size=2,
    max_overflow=2,
    pool_timeout=60,
    pool_pre_ping=True,
    pool_recycle=1800,
    echo=False,
    future=True,
    connect_args=_connect,
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

        # Tables that are fully derived/computed — safe to drop and recreate
        # if their schema is out of date (missing columns from later model changes).
        tables_to_validate = {
            "market_statistics": {
                "avg_price_7d", "min_price_7d", "max_price_7d", "volume_7d",
                "avg_price_30d", "min_price_30d", "max_price_30d", "volume_30d",
                "price_trend_7d", "price_trend_30d", "volume_trend_7d", "volume_trend_30d",
                "liquidity_score", "volatility", "sample_size", "data_quality",
                "calculated_at", "created_at",
            },
            "deal_scores": {
                "product_name", "product_set", "category", "current_price",
                "currency", "condition", "source", "market_avg_price", "market_min_price",
                "price_deviation_score", "volume_trend_score", "liquidity_score",
                "popularity_score", "deal_score", "confidence", "data_quality",
                "is_active", "expires_at", "calculated_at", "created_at",
            },
            "signals": {
                "signal_type", "signal_level", "product_name", "product_set", "category",
                "current_price", "market_avg_price", "deal_score", "description",
                "signal_metadata", "confidence", "priority", "is_active", "is_sent",
                "sent_at", "detected_at", "expires_at", "created_at",
            },
        }

        def check_and_drop(sync_conn):
            insp = inspect(sync_conn)
            for table_name, required_cols in tables_to_validate.items():
                if insp.has_table(table_name):
                    existing = {col["name"] for col in insp.get_columns(table_name)}
                    if not required_cols.issubset(existing):
                        sync_conn.execute(text(f"DROP TABLE IF EXISTS {table_name} CASCADE"))

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
