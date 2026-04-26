"""
Telegram Bot API utility — sends messages via HTTP (no library needed).
"""
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def _base_url() -> str:
    return f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"


async def send_message(chat_id: str, text: str, parse_mode: str = "HTML") -> bool:
    """Send a Telegram message. Returns True on success."""
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.debug("TELEGRAM_BOT_TOKEN not set — skipping")
        return False
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{_base_url()}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode},
                timeout=10.0,
            )
            if r.status_code == 200:
                return True
            logger.error(f"Telegram error {r.status_code}: {r.text}")
            return False
    except Exception as e:
        logger.error(f"Telegram send failed: {e}")
        return False


async def set_webhook(webhook_url: str) -> bool:
    """Register the webhook URL with Telegram."""
    if not settings.TELEGRAM_BOT_TOKEN:
        return False
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"{_base_url()}/setWebhook",
                json={"url": webhook_url, "allowed_updates": ["message"]},
                timeout=10.0,
            )
            ok = r.json().get("ok", False)
            if ok:
                logger.info(f"Telegram webhook set: {webhook_url}")
            else:
                logger.error(f"Telegram webhook failed: {r.text}")
            return ok
    except Exception as e:
        logger.error(f"set_webhook failed: {e}")
        return False
