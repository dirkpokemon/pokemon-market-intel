"""
Database Configuration for Scraper Service
"""

import ssl
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import inspect, text

from app.config import settings

def _make_async_url(url: str) -> str:
    url = url.replace("postgres://", "postgresql://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url

def _connect_args(url: str) -> dict:
    if "proxy.rlwy.net" in url or "railway" in url.lower():
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return {"ssl": ctx}
    if "supabase.co" in url:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return {"ssl": ctx}
    return {}

# Create async engine
engine = create_async_engine(
    _make_async_url(settings.DATABASE_URL),
    connect_args=_connect_args(settings.DATABASE_URL),
    # Scraper inserts sequentially; keep the shared Postgres connection budget small
    pool_size=2,
    max_overflow=2,
    pool_pre_ping=True,
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


def sync_schema(sync_conn) -> None:
    """
    Additive schema sync (same pattern as backend/app/database.py): create
    missing tables, add missing nullable columns, never drop anything, and
    enable Row-Level Security so Supabase's public API cannot read the tables.
    """
    Base.metadata.create_all(sync_conn)
    insp = inspect(sync_conn)
    preparer = sync_conn.dialect.identifier_preparer
    for table in Base.metadata.sorted_tables:
        existing = {c["name"] for c in insp.get_columns(table.name)}
        for column in table.columns:
            if column.name not in existing:
                col_type = column.type.compile(dialect=sync_conn.dialect)
                sync_conn.execute(text(
                    f"ALTER TABLE {preparer.quote(table.name)} "
                    f"ADD COLUMN IF NOT EXISTS {preparer.quote(column.name)} {col_type}"
                ))
        sync_conn.execute(text(f"ALTER TABLE {preparer.quote(table.name)} ENABLE ROW LEVEL SECURITY"))


async def init_db() -> None:
    """
    Initialize database — create missing tables/columns for the scraper models.
    """
    import app.models  # noqa: F401 — registers all models with Base.metadata
    async with engine.begin() as conn:
        await conn.run_sync(sync_schema)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Get database session
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
