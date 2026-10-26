"""
Watchlist alert checker — runs after each analysis pipeline cycle.

Compares the current cheapest comparable listing (market_statistics.current_price)
against user target prices and sends an email alert when a target is hit.
"""
import hashlib
import hmac
import html as html_module
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx
from sqlalchemy import text

from app.config import settings
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

# Name/set comparison key in SQL: lowercase, punctuation stripped, whitespace
# collapsed. Older watchlist items were saved from title-cased, punctuation-
# stripped deal names ("Professors Research"); current names keep the scraped
# spelling ("Professor's Research"). Comparing keys matches both.
_KEY_SQL = "regexp_replace(regexp_replace(lower({col}), '[^[:alnum:][:space:]-]', '', 'g'), '\\s+', ' ', 'g')"


def _key(col: str) -> str:
    return "btrim(" + _KEY_SQL.format(col=col) + ")"


# ---------------------------------------------------------------------------
# Standalone helpers (no shared utils — analysis is a separate service)
# ---------------------------------------------------------------------------


def _unsubscribe_url(user_id: int) -> Optional[str]:
    """
    One-click unsubscribe link for alert emails. Must produce the same token as
    backend/app/core/unsubscribe.py (requires the backend SECRET_KEY).
    """
    if not settings.SECRET_KEY:
        return None
    msg = f"unsubscribe:{user_id}:alerts".encode()
    token = hmac.new(settings.SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()[:32]
    query = urlencode({"u": user_id, "k": "alerts", "t": token})
    return f"{settings.FRONTEND_URL.rstrip('/')}/unsubscribe?{query}"


async def _send_email_alert(to_email: str, subject: str, html: str, text_body: str, unsub_url: Optional[str]) -> bool:
    """Send an email via the Brevo API."""
    if not settings.BREVO_API_KEY:
        logger.warning("BREVO_API_KEY not set — watchlist alert emails are disabled")
        return False
    payload = {
        "sender": {"name": "TCG Pulse Alerts", "email": settings.sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html,
        "textContent": text_body,
    }
    if unsub_url:
        payload["headers"] = {"List-Unsubscribe": f"<{unsub_url}>"}
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                BREVO_API_URL,
                json=payload,
                headers={"api-key": settings.BREVO_API_KEY, "Content-Type": "application/json"},
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


def _eur(value: float) -> str:
    """Dutch notation: 1.234,50"""
    return f"{value:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def _build_alert_html(
    card_name: str, card_set: Optional[str], price: float, target: float, unsub_url: Optional[str]
) -> str:
    esc = html_module.escape
    app_url = settings.FRONTEND_URL.rstrip("/")
    set_label = f" ({esc(card_set)})" if card_set else ""
    unsub_link = (
        f'<a href="{esc(unsub_url)}" style="color:#94a3b8;">Afmelden voor prijsalerts</a> &middot; '
        if unsub_url else ""
    )
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
                De goedkoopste aanbieding van <strong style="color:#ffffff;">{esc(card_name)}{set_label}</strong>
                zit op of onder je doelprijs.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1e293b;">
                    <span style="color:#64748b;font-size:13px;">Huidige prijs</span><br>
                    <span style="color:#34d399;font-size:24px;font-weight:700;">&euro; {_eur(price)}</span>
                  </td>
                  <td style="padding:16px 20px;border-bottom:1px solid #1e293b;border-left:1px solid #1e293b;">
                    <span style="color:#64748b;font-size:13px;">Jouw doelprijs</span><br>
                    <span style="color:#94a3b8;font-size:24px;font-weight:700;">&euro; {_eur(target)}</span>
                  </td>
                </tr>
              </table>
              <div style="text-align:center;">
                <a href="{app_url}/deals"
                   style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">
                  Bekijk deals &#8594;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #334155;">
              <p style="margin:0;font-size:12px;color:#475569;text-align:center;">
                {unsub_link}<a href="{app_url}/watchlist" style="color:#94a3b8;">Beheer je watchlist</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _build_alert_text(card_name: str, card_set: Optional[str], price: float, target: float, unsub_url: Optional[str]) -> str:
    set_label = f" ({card_set})" if card_set else ""
    lines = [
        f"Prijsalert: {card_name}{set_label}",
        f"Huidige prijs: € {_eur(price)} (jouw doelprijs: € {_eur(target)})",
        f"Bekijk deals: {settings.FRONTEND_URL.rstrip('/')}/deals",
    ]
    if unsub_url:
        lines.append(f"Afmelden voor prijsalerts: {unsub_url}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main checker
# ---------------------------------------------------------------------------


PRICE_LOOKUP_SQL = f"""
    SELECT COALESCE(current_price, avg_price_7d) AS price
    FROM market_statistics
    WHERE {_key('product_name')} = btrim({_KEY_SQL.format(col=':name')})
      AND (CAST(:set AS text) IS NULL OR {_key('product_set')} = btrim({_KEY_SQL.format(col='CAST(:set AS text)')}))
      AND (CAST(:card AS text) IS NULL OR card_number = CAST(:card AS text))
      AND COALESCE(language, 'EN') = COALESCE(CAST(:lang AS text), 'EN')
      AND COALESCE(current_price, avg_price_7d) IS NOT NULL
    ORDER BY COALESCE(current_price, avg_price_7d) ASC
    LIMIT 1
"""


async def check_watchlist_alerts() -> int:
    """
    Check all active watchlist items and send alerts where the current market
    price is at or below the user's target price.

    Cooldown: at most one alert per item per 24 hours.

    Returns the number of alerts sent.
    """
    alerts_sent = 0
    now = datetime.now(timezone.utc)
    cooldown = timedelta(hours=24)

    async with AsyncSessionLocal() as session:
        rows = await session.execute(text("""
            SELECT
                wi.id            AS item_id,
                wi.card_name,
                wi.card_set,
                wi.card_number,
                wi.language,
                wi.target_price,
                wi.notified_at,
                u.id             AS user_id,
                u.alert_email,
                u.email
            FROM watchlist_items wi
            JOIN users u ON u.id = wi.user_id
            WHERE wi.is_active = TRUE
              AND u.is_active = TRUE
              AND u.is_verified = TRUE
              AND u.alerts_enabled = TRUE
        """))
        items = rows.fetchall()

        for item in items:
            card_name = item.card_name
            card_set = item.card_set
            target = float(item.target_price)

            price_row = await session.execute(
                text(PRICE_LOOKUP_SQL),
                {"name": card_name, "set": card_set, "card": item.card_number, "lang": item.language},
            )
            price_result = price_row.fetchone()
            if price_result is None:
                continue

            market_price = float(price_result.price)
            await session.execute(
                text("UPDATE watchlist_items SET current_price = :price WHERE id = :id"),
                {"price": market_price, "id": item.item_id},
            )

            if market_price > target:
                continue

            if item.notified_at is not None:
                notified_at = item.notified_at
                if notified_at.tzinfo is None:
                    notified_at = notified_at.replace(tzinfo=timezone.utc)
                if now - notified_at < cooldown:
                    continue

            to_email = item.alert_email or item.email
            if not to_email:
                continue

            unsub_url = _unsubscribe_url(item.user_id)
            subject = f"Prijsalert: {card_name} nu € {_eur(market_price)}"
            ok = await _send_email_alert(
                to_email,
                subject,
                _build_alert_html(card_name, card_set, market_price, target, unsub_url),
                _build_alert_text(card_name, card_set, market_price, target, unsub_url),
                unsub_url,
            )
            if ok:
                await session.execute(
                    text("UPDATE watchlist_items SET notified_at = :now WHERE id = :id"),
                    {"now": now, "id": item.item_id},
                )
                alerts_sent += 1
                logger.info(
                    f"Watchlist alert sent for {card_name} "
                    f"(price={market_price:.2f}, target={target:.2f}, user={item.user_id})"
                )

        await session.commit()

    return alerts_sent
