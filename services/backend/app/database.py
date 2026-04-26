"""
Database Configuration and Session Management
"""

import logging
import ssl
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text

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
    logger.info("Railway PostgreSQL detected - SSL enabled (no verify)")
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
    Initialize database connection and run idempotent schema migrations.
    """
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
            logger.info("Database connection successful")

            # --- Watchlist table --------------------------------------------------
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS watchlist_items (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    card_name VARCHAR(255) NOT NULL,
                    card_set VARCHAR(255),
                    target_price NUMERIC(10,2) NOT NULL,
                    current_price NUMERIC(10,2),
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    notified_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist_items(user_id)"
            ))

            # --- New user columns --------------------------------------------------
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
                "email_digest_enabled BOOLEAN NOT NULL DEFAULT TRUE"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
                "telegram_connect_token VARCHAR(64)"
            ))
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
                "telegram_connect_token_expires TIMESTAMPTZ"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_users_tg_token "
                "ON users(telegram_connect_token) "
                "WHERE telegram_connect_token IS NOT NULL"
            ))

            logger.info("Schema migrations applied successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
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
