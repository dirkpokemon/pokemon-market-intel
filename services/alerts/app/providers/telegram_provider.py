"""
Telegram Bot Provider
Sends alerts via Telegram Bot API
"""

import logging
from typing import Optional
from dataclasses import dataclass

from telegram import Bot
from telegram.error import TelegramError

from app.config import settings


logger = logging.getLogger(__name__)


@dataclass
class TelegramMessage:
    """Telegram message data structure"""
    chat_id: str
    text: str
    parse_mode: str = "HTML"  # HTML or Markdown


class TelegramProvider:
    """Telegram bot provider for sending alerts"""
    
    def __init__(self, bot_token: str):
        self.bot_token = bot_token
        self.bot = Bot(token=bot_token)
        logger.info("Telegram provider initialized")
    
    async def send_message(self, message: TelegramMessage) -> tuple[bool, Optional[str]]:
        """
        Send message via Telegram Bot API
        
        Returns:
            (success: bool, message_id: Optional[str])
        """
        try:
            if settings.DRY_RUN:
                logger.info(f"[DRY RUN] Would send Telegram message to {message.chat_id}")
                return True, "dry-run-telegram-id"
            
            # Send message
            sent_message = await self.bot.send_message(
                chat_id=message.chat_id,
                text=message.text,
                parse_mode=message.parse_mode,
                disable_web_page_preview=False
            )
            
            message_id = str(sent_message.message_id)
            logger.info(f"✅ Telegram message sent to {message.chat_id} (ID: {message_id})")
            return True, message_id
            
        except TelegramError as e:
            logger.error(f"❌ Telegram send failed to {message.chat_id}: {str(e)}")
            return False, None
        except Exception as e:
            logger.error(f"❌ Telegram unexpected error for {message.chat_id}: {str(e)}")
            return False, None
    
    async def get_bot_info(self):
        """Get bot information (for verification)"""
        try:
            return await self.bot.get_me()
        except Exception as e:
            logger.error(f"Failed to get bot info: {str(e)}")
            return None


def get_telegram_provider() -> Optional[TelegramProvider]:
    """
    Factory function to get configured Telegram provider
    
    Returns:
        TelegramProvider instance if enabled and configured, None otherwise
    """
    if not settings.TELEGRAM_ENABLED:
        logger.info("Telegram provider disabled")
        return None
    
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("Telegram enabled but TELEGRAM_BOT_TOKEN not set")
        return None
    
    return TelegramProvider(bot_token=settings.TELEGRAM_BOT_TOKEN)


def format_signal_for_telegram(signal_data: dict) -> str:
    """
    Format signal data as Telegram HTML message
    
    Args:
        signal_data: Dict containing signal information
    
    Returns:
        Formatted HTML string for Telegram
    """
    # Extract data
    product = signal_data.get("product_name", "Unknown Product")
    product_set = signal_data.get("product_set", "")
    level = signal_data.get("signal_level", "").upper()
    signal_type = signal_data.get("signal_type", "")
    current_price = signal_data.get("current_price")
    market_avg = signal_data.get("market_avg_price")
    deal_score = signal_data.get("deal_score")
    description = signal_data.get("description", "")
    
    # Build message
    parts = []
    
    # Header with emoji based on level
    emoji = "🔥" if level == "HIGH" else "⚡"
    parts.append(f"{emoji} <b>{level} PRIORITY ALERT</b>\n")
    
    # Product info
    parts.append(f"<b>{product}</b>")
    if product_set:
        parts.append(f" — {product_set}")
    parts.append("\n\n")
    
    # Pricing info
    if current_price:
        parts.append(f"💰 <b>Price:</b> €{current_price:.2f}\n")
    if market_avg:
        parts.append(f"📊 <b>Market Avg:</b> €{market_avg:.2f}\n")
    if deal_score:
        parts.append(f"⭐ <b>Deal Score:</b> {deal_score:.1f}/100\n")
    
    # Description
    if description:
        parts.append(f"\n{description}\n")
    
    # Footer
    parts.append(f"\n🏷️ Type: {signal_type}")
    parts.append("\n\n<a href=\"http://localhost:3000/dashboard\">View Dashboard</a>")
    
    return "".join(parts)
