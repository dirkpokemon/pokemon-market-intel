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
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
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


def sync_schema(sync_conn) -> None:
    """
    Additive schema sync, shared pattern with the scraper and analysis services:

    1. create missing tables from the ORM models,
    2. add missing (nullable) columns to existing tables — never drop anything,
    3. enable Row-Level Security so Supabase's public PostgREST API cannot read
       the tables (the app connects as the owner/postgres role, which RLS
       without policies does not restrict).
    """
    from sqlalchemy import inspect

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
    Initialize database — create missing tables/columns from the ORM models.
    Idempotent and additive; Alembic migrations remain the source of truth.
    """
    try:
        # Import all models so they register themselves with Base.metadata
        import app.models  # noqa: F401

        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
            logger.info("Database connection successful")

            await conn.run_sync(sync_schema)
            logger.info("Schema created/verified successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        # Don't raise — app can still start and serve the /health endpoint


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
