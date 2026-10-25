"""
Database Configuration for Analysis Service
"""

import logging
import ssl
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import inspect, text
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
    """Configure SSL based on host."""
    if "proxy.rlwy.net" in url or "railway" in url.lower():
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        logger.info("Railway PostgreSQL detected — SSL enabled (no verify)")
        return {"ssl": ssl_ctx}
    if "supabase.co" in url:
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        logger.info("Supabase PostgreSQL detected — SSL enabled (no verify)")
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


def sync_schema(sync_conn) -> None:
    """
    Additive schema sync (same pattern as backend/app/database.py): create
    missing tables, add missing nullable columns, and enable Row-Level Security
    so Supabase's public API cannot read the tables.

    Never drops tables: dropping market_statistics / deal_scores used to throw
    away the RLS setting and indexes created by the backend migrations, and the
    backend would then recreate them with its own (smaller) column set.
    """
    Base.metadata.create_all(sync_conn)
    insp = inspect(sync_conn)
    preparer = sync_conn.dialect.identifier_preparer
    for table in Base.metadata.sorted_tables:
        existing = {c["name"] for c in insp.get_columns(table.name)}
        for column in table.columns:
            if column.name in existing:
                continue
            col_type = column.type.compile(dialect=sync_conn.dialect)
            sync_conn.execute(text(
                f"ALTER TABLE {preparer.quote(table.name)} "
                f"ADD COLUMN IF NOT EXISTS {preparer.quote(column.name)} {col_type}"
            ))
            logger.warning("Schema sync: added missing column %s.%s", table.name, column.name)
        sync_conn.execute(text(f"ALTER TABLE {preparer.quote(table.name)} ENABLE ROW LEVEL SECURITY"))


async def init_db() -> None:
    """
    Initialize database: create missing tables/columns for the analysis models.
    """
    from app import models  # noqa: F401 — register models with Base.metadata

    async with engine.begin() as conn:
        await conn.run_sync(sync_schema)


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
