"""
Database Configuration for Scraper Service
"""

import ssl
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

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
    Initialize database — create all tables defined in scraper models.
    """
    import app.models  # noqa: F401 — registers all models with Base.metadata
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


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
