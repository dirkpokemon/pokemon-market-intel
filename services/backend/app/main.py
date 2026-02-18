"""
FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events
    """
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",  # Always enable docs for easier debugging
    redoc_url="/redoc",  # Always enable redoc
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
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
    Root endpoint
    """
    return {
        "message": "Pokemon Market Intelligence EU API",
        "version": settings.APP_VERSION,
        "docs": "/docs" if settings.DEBUG else "disabled",
    }


# Import and include routers
from app.api import auth, market, subscriptions, stripe_webhook

app.include_router(auth.router, prefix="/api/v1")
app.include_router(market.router, prefix="/api/v1")
app.include_router(subscriptions.router, prefix="/api/v1")
app.include_router(stripe_webhook.router, prefix="/api/v1")
