"""
Database Configuration and Session Management
"""

import logging
import ssl
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.config import settings

logger = logging.getLogger(__name__)

# Build connect args for SSL support (Railway PostgreSQL)
connect_args = {}
db_url = settings.DATABASE_URL

# Configure SSL based on host
if "proxy.rlwy.net" in db_url or "railway" in db_url:
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    connect_args["ssl"] = ssl_ctx
    logger.info("Railway PostgreSQL detected â€” SSL enabled (no verify)")
elif "supabase.co" in db_url:
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    connect_args["ssl"] = ssl_ctx
    logger.info("Supabase PostgreSQL detected - SSL enabled (no verify)")

logger.info(f"Connecting to database: {db_url[:50]}...")

# Create async engine with conservative pool settings
engine = create_async_engine(
    db_url,
    pool_size=5,  # Conservative for Railway free tier
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=1800,  # Recycle connections every 30 min
    pool_pre_ping=True,  # Verify connections before using them
    echo=settings.DEBUG,
    future=True,
    connect_args=connect_args,
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
    Initialize database connection
    """
    try:
        from sqlalchemy import text
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            logger.info(f"âœ… Database connection successful")
    except Exception as e:
        logger.error(f"âŒ Database connection failed: {e}")
        # Don't raise - app can still start and health check will work


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting database session
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
