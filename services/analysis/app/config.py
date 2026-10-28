"""
Analysis Service Configuration
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Analysis settings loaded from environment variables.
    Analysis tuning parameters live in config_analysis.py (ANALYSIS_* env vars).
    """

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    # Application
    APP_VERSION: str = "1.0.0"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str

    # Scheduling (long-running mode only; Railway runs `--once` on a cron)
    ANALYSIS_SCHEDULE: str = "0 * * * *"  # Every hour

    # Watchlist alert emails: Gmail API when GMAIL_REFRESH_TOKEN is set, else SMTP
    # (Gmail by default). Same values as on the backend.
    GMAIL_CLIENT_ID: str = ""
    GMAIL_CLIENT_SECRET: str = ""
    GMAIL_REFRESH_TOKEN: str = ""
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    FRONTEND_URL: str = "https://charming-contentment-production-ce0e.up.railway.app"
    # Must equal the backend SECRET_KEY: signs the one-click unsubscribe links
    SECRET_KEY: str = ""

    @property
    def sender_email(self) -> str:
        return (self.SMTP_FROM or self.SMTP_USER or "pokemonmarketintel@gmail.com").strip()


settings = Settings()
