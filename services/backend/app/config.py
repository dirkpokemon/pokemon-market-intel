"""
Application Configuration
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    """

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    # Application
    APP_NAME: str = "TCG Pulse API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10

    # Security
    SECRET_KEY: str  # Required for JWT tokens
    JWT_SECRET: str = ""  # Optional, uses SECRET_KEY if not set
    ALGORITHM: str = "HS256"  # Alias for JWT_ALGORITHM
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    # CORS - accepts comma-separated string or JSON array from env
    CORS_ORIGINS: str = "http://localhost:3000,https://charming-contentment-production-ce0e.up.railway.app"
    
    @property
    def cors_origins_list(self) -> list:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # Stripe (optional - only needed for payment processing)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    # Subscription Price IDs — must match Stripe Dashboard & frontend NEXT_PUBLIC_STRIPE_PRICE_*
    STRIPE_PRICE_PAID: str = ""
    STRIPE_PRICE_PRO: str = ""
    # Legacy: if STRIPE_PRICE_PRO is empty, STRIPE_PRICE_ID_PRO is used for the Pro tier
    STRIPE_PRICE_ID_FREE: str = ""
    STRIPE_PRICE_ID_PRO: str = ""
    STRIPE_PRICE_ID_ENTERPRISE: str = ""

    # Email (optional)
    BREVO_API_KEY: str = ""
    RESEND_API_KEY: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""

    # Product feedback: Brevo/SMTP sends submissions here (see POST /api/v1/feedback)
    FEEDBACK_INBOX_EMAIL: str = ""

    # Telegram Bot
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_BOT_USERNAME: str = "TCGPulseBot"

    # Public backend URL (used for Telegram webhook registration)
    BACKEND_URL: str = ""

    # Redis (optional)
    REDIS_URL: str = ""

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_BURST: int = 100

    # EU Compliance
    DATA_RETENTION_DAYS: int = 730
    ENABLE_GDPR_FEATURES: bool = True

    @property
    def stripe_paid_price_id(self) -> str:
        return (self.STRIPE_PRICE_PAID or "").strip()

    @property
    def stripe_pro_price_id(self) -> str:
        return (self.STRIPE_PRICE_PRO or self.STRIPE_PRICE_ID_PRO or "").strip()


settings = Settings()
