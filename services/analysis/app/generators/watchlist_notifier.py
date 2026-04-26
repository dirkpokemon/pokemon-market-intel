"""
Watchlist alert checker — runs after each analysis pipeline cycle.

Compares market prices against user target prices and sends
Telegram / email alerts when a target is hit.
"""
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
DEALS_URL = "https://charming-contentment-production-ce0e.up.railway.app/deals"


# ---------------------------------------------------------------------------
# Standalone messaging helpers (no shared utils — analysis is a separate service)
# ---------------------------------------------------------------------------


async def _send_telegram_message(chat_id: str, text_msg: str) -> bool:
    """Send a Telegram message using the bot token from environment."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token:
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                url,
                json={"chat_id": chat_id, "text": text_msg, "parse_mode": "HTML"},
                timeout=10.0,
            )
            if r.status_code == 200:
                return True
            logger.error(f"Telegram error {r.status_code}: {r.text}")
            return False
    except Exception as e:
        logger.error(f"Telegram send failed: {e}")
        return False


async def _send_email_alert(to_email: str, subject: str, html: str) -> bool:
    """Send an email via Brevo API using credentials from environment."""
    api_key = os.environ.get("BREVO_API_KEY", "")
    if not api_key:
        return False
    sender_email = os.environ.get("SMTP_FROM", "noreply@tcgpulse.com")
    payload = {
        "sender": {"name": "TCG Pulse Alerts", "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html,
        "textContent": subject,
    }
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                BREVO_API_URL,
                json=payload,
                headers={"api-key": api_key, "Content-Type": "application/json"},
                timeout=15.0,
            )
            if r.status_code in (200, 201, 202):
                return True
            logger.error(f"Brevo error {r.status_code}: {r.text}")
            return False
    except Exception as e:
        logger.error(f"Brevo send failed: {e}")
        return False


# ---------------------------------------------------------------------------
# Alert email template
# ---------------------------------------------------------------------------


def _build_alert_html(card_name: str, card_set: Optional[str], price: float, target: float) -> str:
    set_label = f" ({card_set})" if card_set else ""
    return f"""<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#1e293b;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#064e3b;padding:24px 32px;text-align:center;">
              <div style="font-size:36px;">&#127919;</div>
              <h1 style="margin:8px 0 0;font-size:20px;color:#ffffff;">Prijsalert bereikt!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#cbd5e1;">
                De prijs van <strong style="color:#ffffff;">{card_name}{set_label}</strong>
                is gedaald naar je doelprijs.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1e293b;">
                    <span style="color:#64748b;font-size:13px;">Huidige prijs</span><br>
                    <span style="color:#34d399;font-size:24px;font-weight:700;">&euro;{price:.2f}</span>
                  </td>
                  <td style="padding:16px 20px;border-bottom:1px solid #1e293b;border-left:1px solid #1e293b;">
                    <span style="color:#64748b;font-size:13px;">Jouw doelprijs</span><br>
                    <span style="color:#94a3b8;font-size:24px;font-weight:700;">&euro;{target:.2f}</span>
                  </td>
                </tr>
              </table>
              <div style="text-align:center;">
                <a href="{DEALS_URL}"
                   style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">
                  Bekijk deals &#8594;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #334155;">
              <p style="margin:0;font-size:12px;color:#475569;text-align:center;">
                Stuur <strong>STOP</strong> naar de TCG Pulse bot om alerts te stoppen.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Main checker
# ---------------------------------------------------------------------------


async def check_watchlist_alerts() -> int:
    """
    Check all active watchlist items and send alerts where the market price
    has dropped to or below the user's target price.

    Cooldown: at most one alert per item per 24 hours.

    Returns the number of alerts sent.
    """
    alerts_sent = 0
    now = datetime.now(timezone.utc)
    cooldown = timedelta(hours=24)

    async with AsyncSessionLocal() as session:
        # Load all active watchlist items together with user data
        rows = await session.execute(text("""
            SELECT
                wi.id            AS item_id,
                wi.card_name,
                wi.card_set,
                wi.target_price,
                wi.notified_at,
                u.id             AS user_id,
                u.telegram_chat_id,
                u.alert_email,
                u.email,
                u.alerts_enabled
            FROM watchlist_items wi
            JOIN users u ON u.id = wi.user_id
            WHERE wi.is_active = TRUE
              AND u.is_active = TRUE
              AND u.alerts_enabled = TRUE
        """))
        items = rows.fetchall()

        for item in items:
            card_name = item.card_name
            card_set = item.card_set
            target = float(item.target_price)

            # Check cooldown
            if item.notified_at is not None:
                notified_at = item.notified_at
                # Make timezone-aware if naive
                if notified_at.tzinfo is None:
                    notified_at = notified_at.replace(tzinfo=timezone.utc)
                if now - notified_at < cooldown:
                    continue

            # Look up current market price from market_statistics (use 7-day avg)
            price_row = await session.execute(text("""
                SELECT avg_price_7d AS market_avg_price
                FROM market_statistics
                WHERE product_name = :name
                  AND (:set IS NULL OR product_set = :set)
                ORDER BY calculated_at DESC
                LIMIT 1
            """), {"name": card_name, "set": card_set})
            price_result = price_row.fetchone()

            if price_result is None:
                # Also try deal_scores as fallback
                price_row2 = await session.execute(text("""
                    SELECT market_avg_price
                    FROM deal_scores
                    WHERE product_name = :name
                      AND (:set IS NULL OR product_set = :set)
                      AND is_active = TRUE
                    ORDER BY calculated_at DESC
                    LIMIT 1
                """), {"name": card_name, "set": card_set})
                price_result = price_row2.fetchone()

            if price_result is None:
                continue

            market_price = float(price_result[0])

            if market_price > target:
                # Price has not reached target yet — update cached price and move on
                await session.execute(text("""
                    UPDATE watchlist_items
                    SET current_price = :price
                    WHERE id = :id
                """), {"price": market_price, "id": item.item_id})
                continue

            # Target hit — send alerts
            item_alerts = 0
            tg_chat = item.telegram_chat_id
            to_email = item.alert_email or item.email

            if tg_chat:
                set_label = f" ({card_set})" if card_set else ""
                tg_text = (
                    f"Prijsalert: <b>{card_name}</b>\n\n"
                    f"De prijs van <b>{card_name}</b>{set_label} is gedaald naar "
                    f"<b>€{market_price:.2f}</b>.\n"
                    f"Je doelprijs was <b>€{target:.2f}</b>.\n\n"
                    f'<a href="{DEALS_URL}">Bekijk deals →</a>'
                )
                ok = await _send_telegram_message(tg_chat, tg_text)
                if ok:
                    item_alerts += 1

            if to_email:
                subject = f"Prijsalert: {card_name} nu €{market_price:.2f}"
                html = _build_alert_html(card_name, card_set, market_price, target)
                ok = await _send_email_alert(to_email, subject, html)
                if ok:
                    item_alerts += 1

            if item_alerts > 0:
                # Update notified_at and cached price
                await session.execute(text("""
                    UPDATE watchlist_items
                    SET notified_at = :now,
                        current_price = :price
                    WHERE id = :id
                """), {"now": now, "price": market_price, "id": item.item_id})
                alerts_sent += item_alerts
                logger.info(
                    f"Watchlist alert sent for {card_name} "
                    f"(price={market_price:.2f}, target={target:.2f}, user={item.user_id})"
                )

        await session.commit()

    return alerts_sent
