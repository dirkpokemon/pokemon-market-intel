"""
Alert Engine Configuration
Manages settings for email, Telegram, and alert rules
"""

from typing import Optional, Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Alert Engine settings loaded from environment variables"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Database
    DATABASE_URL: str
    
    # Email Provider Configuration
    EMAIL_PROVIDER: Literal["sendgrid", "smtp"] = "sendgrid"
    
    # SendGrid Configuration
    SENDGRID_API_KEY: Optional[str] = None
    SENDGRID_FROM_EMAIL: str = "alerts@pokemonintel.eu"
    SENDGRID_FROM_NAME: str = "Pokemon Intel EU"
    
    # SMTP Configuration
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "alerts@pokemonintel.eu"
    SMTP_FROM_NAME: str = "Pokemon Intel EU"
    SMTP_USE_TLS: bool = True
    
    # Telegram Configuration
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_ENABLED: bool = False
    
    # Alert Engine Configuration
    ALERT_ENGINE_ENABLED: bool = True
    CHECK_INTERVAL_MINUTES: int = 5
    HIGH_PRIORITY_IMMEDIATE: bool = True
    MEDIUM_PRIORITY_DIGEST: bool = True
    DIGEST_SEND_HOUR: int = 9  # UTC hour to send daily digest
    
    # Alert Rules
    HIGH_SEVERITY_LEVELS: list[str] = ["high"]
    MEDIUM_SEVERITY_LEVELS: list[str] = ["medium"]
    LOW_SEVERITY_LEVELS: list[str] = ["low"]
    
    # Minimum deal scores for alerts
    MIN_DEAL_SCORE_HIGH: float = 80.0
    MIN_DEAL_SCORE_MEDIUM: float = 70.0
    
    # Rate limiting (per user per day)
    MAX_ALERTS_PER_USER_PER_DAY: int = 10
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Testing/Development
    DRY_RUN: bool = False  # If true, log alerts but don't actually send
    
    # Frontend URL (for links in emails)
    FRONTEND_URL: str = "http://localhost:3000"


# Global settings instance
settings = Settings()
