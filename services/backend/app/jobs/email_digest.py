"""
Daily email digest — top deals for all opted-in users.
"""
import logging
from datetime import datetime, timezone

from sqlalchemy import select, desc

from app.database import AsyncSessionLocal
from app.models.deal_score import DealScore
from app.models.user import User
from app.utils.email import send_email

logger = logging.getLogger(__name__)


def _build_html(deals: list) -> str:
    """Build a dark-themed HTML email with a top-deals table."""

    # --- Deals rows ---
    deal_rows = ""
    for d in deals:
        current = float(d.current_price or 0)
        avg = float(d.market_avg_price or 0)
        saving_pct = round((avg - current) / avg * 100, 1) if avg > 0 else 0
        score = float(d.deal_score or 0)
        deal_rows += f"""
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #1e293b;">{d.product_name or ""}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#94a3b8;">{d.product_set or ""}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#34d399;">&euro;{current:.2f}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #1e293b;text-align:center;">
                <span style="background:#064e3b;color:#34d399;padding:2px 8px;border-radius:12px;font-size:12px;">{score:.0f}</span>
              </td>
              <td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#34d399;">-{saving_pct}%</td>
            </tr>
        """

    no_deals_msg = "" if deal_rows else "<tr><td colspan='5' style='padding:12px;color:#64748b;text-align:center;'>Geen deals gevonden</td></tr>"

    return f"""<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>TCG Pulse — Dagelijkse Marktupdate</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;min-height:100vh;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#064e3b,#0f172a);padding:32px;border-radius:16px 16px 0 0;text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">&#127924;</div>
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">TCG Pulse</h1>
              <p style="margin:8px 0 0;color:#34d399;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Dagelijkse Marktupdate</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#1e293b;padding:32px;border-radius:0 0 16px 16px;">

              <!-- Top Deals section -->
              <h2 style="margin:0 0 16px;font-size:18px;color:#34d399;border-bottom:1px solid #334155;padding-bottom:12px;">
                &#128200; Top Deals vandaag
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:32px;">
                <thead>
                  <tr style="background:#0f172a;">
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Kaart</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Set</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Prijs</th>
                    <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Score</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Besparing</th>
                  </tr>
                </thead>
                <tbody>
                  {deal_rows or no_deals_msg}
                </tbody>
              </table>

              <!-- CTA -->
              <div style="text-align:center;margin-bottom:32px;">
                <a href="https://charming-contentment-production-ce0e.up.railway.app/deals"
                   style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                  Bekijk alle deals &#8594;
                </a>
              </div>

              <!-- Footer -->
              <hr style="border:none;border-top:1px solid #334155;margin:0 0 20px;">
              <p style="margin:0;font-size:12px;color:#475569;text-align:center;">
                Je ontvangt deze email omdat je aangemeld bent voor de dagelijkse digest.<br>
                Stuur <strong>STOP</strong> naar de TCG Pulse bot om te stoppen, of pas je voorkeuren aan via de website.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _build_text(deals: list) -> str:
    """Plain-text fallback for the digest email."""
    lines = ["TCG Pulse — Dagelijkse Marktupdate", "=" * 40, ""]
    lines.append("TOP DEALS")
    for d in deals:
        current = float(d.current_price or 0)
        avg = float(d.market_avg_price or 0)
        saving_pct = round((avg - current) / avg * 100, 1) if avg > 0 else 0
        lines.append(f"  {d.product_name} ({d.product_set}) — EUR{current:.2f} | Score: {d.deal_score:.0f} | -{saving_pct}%")
    lines += ["", "Stuur STOP naar de TCG Pulse bot om te stoppen."]
    return "\n".join(lines)


async def send_daily_digest() -> int:
    """
    Send the daily digest to all active opted-in users.
    Returns the number of emails successfully sent.
    """
    logger.info("Starting daily email digest job")
    sent_count = 0

    async with AsyncSessionLocal() as session:
        # Fetch top 10 deals ordered by deal_score desc
        deals_result = await session.execute(
            select(DealScore)
            .where(DealScore.is_active == True)
            .order_by(desc(DealScore.deal_score))
            .limit(10)
        )
        deals = deals_result.scalars().all()

        # Fetch all eligible users
        users_result = await session.execute(
            select(User).where(
                User.is_active == True,
                User.email_digest_enabled == True,
            )
        )
        users = users_result.scalars().all()

    logger.info(
        f"Digest: {len(deals)} deals -> {len(users)} recipients"
    )

    if not users:
        logger.info("No recipients for daily digest")
        return 0

    html = _build_html(deals)
    text = _build_text(deals)
    today = datetime.now(timezone.utc).strftime("%d %b %Y")
    subject = f"TCG Pulse — Marktupdate {today}"

    for user in users:
        to_email = user.alert_email or user.email
        try:
            ok = await send_email(to_email, subject, html, text)
            if ok:
                sent_count += 1
        except Exception as e:
            logger.error(f"Failed to send digest to {to_email}: {e}")

    logger.info(f"Daily digest complete: {sent_count}/{len(users)} sent")
    return sent_count
