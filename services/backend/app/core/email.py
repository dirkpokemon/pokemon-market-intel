"""
Email service for sending verification and notification emails.
Uses aiosmtplib for async SMTP delivery with a beautiful HTML template.
"""

import logging
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone

from app.config import settings

logger = logging.getLogger(__name__)

VERIFICATION_TOKEN_HOURS = 48


def generate_verification_token() -> tuple[str, datetime]:
    token = secrets.token_urlsafe(48)
    expires = datetime.now(timezone.utc) + timedelta(hours=VERIFICATION_TOKEN_HOURS)
    return token, expires


def _build_verification_html(first_name: str, verify_url: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#111827 0%,#1f2937 100%);padding:36px 40px;text-align:center;">
          <!-- Pokéball icon -->
          <div style="margin:0 auto 16px;width:56px;height:56px;border-radius:50%;border:3px solid #fff;position:relative;overflow:hidden;display:inline-block;">
            <div style="position:absolute;top:0;left:0;right:0;height:50%;background:#ef4444;border-radius:28px 28px 0 0;"></div>
            <div style="position:absolute;top:50%;left:0;right:0;height:3px;background:#fff;transform:translateY(-50%);z-index:2;"></div>
            <div style="position:absolute;top:50%;left:50%;width:16px;height:16px;background:#fff;border-radius:50%;border:3px solid #fff;transform:translate(-50%,-50%);z-index:3;">
              <div style="position:absolute;inset:3px;background:#d1d5db;border-radius:50%;"></div>
            </div>
          </div>
          <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;letter-spacing:-0.3px;">Pok&eacute;mon Market Intel EU</h1>
          <p style="color:#9ca3af;font-size:13px;margin:6px 0 0;">Real-time market intelligence for the European Pok&eacute;mon TCG market</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px 20px;">
          <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 8px;">Welcome, {first_name}!</h2>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 28px;">
            Thanks for signing up. Verify your email address to unlock full access to market deals, price signals, and portfolio tracking.
          </p>

          <!-- CTA Button -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:0 0 28px;">
              <a href="{verify_url}" target="_blank" style="display:inline-block;background:#111827;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;letter-spacing:0.2px;">
                Verify My Email
              </a>
            </td></tr>
          </table>

          <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0 0 24px;">
            Or copy and paste this link into your browser:<br/>
            <a href="{verify_url}" style="color:#4f46e5;word-break:break-all;font-size:12px;">{verify_url}</a>
          </p>
        </td></tr>

        <!-- Feature highlights -->
        <tr><td style="padding:0 40px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:20px 24px;">
            <tr><td>
              <p style="color:#374151;font-size:14px;font-weight:600;margin:0 0 12px;">What you get access to:</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:6px 0;color:#111827;font-size:14px;" width="28">&#9889;</td>
                  <td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Top Deals</strong> &mdash; Best prices below market average</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#111827;font-size:14px;">&#128200;</td>
                  <td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Market Intelligence</strong> &mdash; Price trends &amp; supply shifts</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#111827;font-size:14px;">&#127919;</td>
                  <td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Portfolio Tracker</strong> &mdash; Watch your collection&rsquo;s value</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#111827;font-size:14px;">&#128276;</td>
                  <td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Smart Alerts</strong> &mdash; Get notified when prices drop</td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;">
            This link expires in {VERIFICATION_TOKEN_HOURS} hours. If you didn&rsquo;t create an account, you can safely ignore this email.
          </p>
          <p style="color:#d1d5db;font-size:11px;margin:12px 0 0;">
            &copy; {datetime.utcnow().year} Pok&eacute;mon Market Intel EU
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _build_verification_text(first_name: str, verify_url: str) -> str:
    return (
        f"Welcome, {first_name}!\n\n"
        f"Thanks for signing up to Pokémon Market Intel EU.\n"
        f"Please verify your email address by clicking the link below:\n\n"
        f"{verify_url}\n\n"
        f"This link expires in {VERIFICATION_TOKEN_HOURS} hours.\n"
        f"If you didn't create an account, you can safely ignore this email."
    )


def send_verification_email(to_email: str, first_name: str, token: str) -> bool:
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    verify_url = f"{frontend_url}/verify?token={token}"

    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.warning(
            "SMTP not configured — printing verification link to console.\n"
            "  ➜  %s", verify_url,
        )
        return True

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Verify your email — Pokémon Market Intel EU"
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
    msg["To"] = to_email

    msg.attach(MIMEText(_build_verification_text(first_name, verify_url), "plain"))
    msg.attach(MIMEText(_build_verification_html(first_name, verify_url), "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            if settings.SMTP_PORT != 25:
                server.starttls()
                server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Verification email sent to %s", to_email)
        return True
    except Exception:
        logger.exception("Failed to send verification email to %s", to_email)
        return False
