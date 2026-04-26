"""
FastAPI Application Entry Point
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db

logger = logging.getLogger(__name__)

# APScheduler
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events
    """
    # Startup - initialize DB but don't fail if it's not ready
    try:
        await init_db()
    except Exception as e:
        logger.warning(f"Database initialization warning: {e}")

    # Schedule daily digest at 08:00 UTC
    try:
        from app.jobs.email_digest import send_daily_digest

        scheduler.add_job(
            send_daily_digest,
            CronTrigger(hour=8, minute=0),
            id="daily_digest",
            max_instances=1,
        )
        scheduler.start()
        logger.info("APScheduler started — daily digest scheduled at 08:00 UTC")
    except Exception as e:
        logger.error(f"Scheduler startup failed: {e}")

    # Register Telegram webhook
    if settings.TELEGRAM_BOT_TOKEN:
        try:
            from app.utils.telegram import set_webhook

            backend_public = settings.BACKEND_URL
            if not backend_public and settings.FRONTEND_URL:
                # Derive backend URL from frontend URL as a fallback
                backend_public = (
                    settings.FRONTEND_URL
                    .replace("frontend", "backend")
                    .replace(":3000", ":8000")
                )
            if backend_public:
                await set_webhook(f"{backend_public}/api/v1/telegram/webhook")
            else:
                logger.warning("BACKEND_URL not set — skipping Telegram webhook registration")
        except Exception as e:
            logger.error(f"Telegram webhook registration failed: {e}")

    yield

    # Shutdown
    if scheduler.running:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",  # Always enable docs for easier debugging
    redoc_url="/redoc",  # Always enable redoc
    lifespan=lifespan,
)

# CORS Middleware
cors_origins = settings.cors_origins_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True if cors_origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "service": "backend-api",
            "version": settings.APP_VERSION,
        },
    )


@app.get("/")
async def root():
    """
    Root endpoint - always responds for Railway health checks
    """
    return JSONResponse(
        status_code=200,
        content={
            "message": "TCG Pulse API",
            "version": settings.APP_VERSION,
            "status": "running",
            "docs": "/docs",
        },
    )


# Import and include routers
from app.api import auth, market, subscriptions, stripe_webhook, admin, feedback, notifications

app.include_router(auth.router, prefix="/api/v1")
app.include_router(market.router, prefix="/api/v1")
app.include_router(subscriptions.router, prefix="/api/v1")
app.include_router(stripe_webhook.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(feedback.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1", tags=["Notifications"])
