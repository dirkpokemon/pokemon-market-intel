"""
Email service for sending verification and notification emails.
Supports Resend (HTTPS API) with SMTP fallback.
"""

import logging
import secrets
import smtplib
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen
from urllib.error import URLError

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
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;"><tr><td style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#6d28d9);text-align:center;vertical-align:middle;">
            <span style="color:#ffffff;font-size:14px;font-weight:800;letter-spacing:-0.5px;">TCG</span>
          </td></tr></table>
          <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;letter-spacing:-0.3px;">TCG Pulse</h1>
          <p style="color:#9ca3af;font-size:13px;margin:6px 0 0;">EU market intelligence for trading card singles</p>
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
                  <td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Market signals</strong> &mdash; Price trends &amp; supply shifts</td>
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
            &copy; {datetime.now(timezone.utc).year} TCG Pulse
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
        f"Thanks for signing up to TCG Pulse.\n"
        f"Please verify your email address by clicking the link below:\n\n"
        f"{verify_url}\n\n"
        f"This link expires in {VERIFICATION_TOKEN_HOURS} hours.\n"
        f"If you didn't create an account, you can safely ignore this email."
    )


def _send_via_brevo(to_email: str, subject: str, html: str, text: str) -> bool:
    """Send email via Brevo (Sendinblue) HTTPS API — free, no domain needed."""
    api_key = settings.BREVO_API_KEY
    if not api_key:
        return False

    sender_email = settings.SMTP_FROM or settings.SMTP_USER or "pokemonmarketintel@gmail.com"

    payload = json.dumps({
        "sender": {"name": "TCG Pulse", "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html,
        "textContent": text,
    }).encode()

    req = Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload,
        headers={
            "api-key": api_key,
            "Content-Type": "application/json",
        },
    )

    try:
        with urlopen(req, timeout=10) as resp:
            logger.info("Email sent via Brevo to %s (status %d)", to_email, resp.status)
            return True
    except URLError as exc:
        logger.warning("Brevo API failed for %s: %s", to_email, exc)
        return False


def _send_via_smtp(to_email: str, msg: MIMEMultipart) -> bool:
    """Send email via SMTP — works locally, often blocked on cloud."""
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        return False

    for port, use_ssl in [(465, True), (587, False)]:
        try:
            if use_ssl:
                with smtplib.SMTP_SSL(settings.SMTP_HOST, port, timeout=10) as server:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(settings.SMTP_HOST, port, timeout=10) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)
            logger.info("Email sent via SMTP to %s (port %d)", to_email, port)
            return True
        except Exception as exc:
            logger.warning("SMTP port %d failed for %s: %s", port, to_email, exc)
            continue

    return False


def _build_subscription_success_html(first_name: str, plan_label: str, app_url: str) -> str:
    year = datetime.now(timezone.utc).year
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#111827 0%,#1f2937 100%);padding:36px 40px;text-align:center;">
          <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;">TCG Pulse</h1>
          <p style="color:#9ca3af;font-size:13px;margin:8px 0 0;">Subscription active</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 12px;">You&rsquo;re in, {first_name}!</h2>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 20px;">
            Your <strong style="color:#111827;">{plan_label}</strong> subscription is active. You now have full access to Signals, deal scores, and the rest of your plan.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:0 0 24px;">
              <a href="{app_url}" target="_blank" style="display:inline-block;background:#111827;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;">
                Open your dashboard
              </a>
            </td></tr>
          </table>
          <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0;">
            Manage billing anytime from your account settings (Stripe customer portal).
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="color:#d1d5db;font-size:11px;margin:0;">&copy; {year} TCG Pulse</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _build_subscription_success_text(first_name: str, plan_label: str, app_url: str) -> str:
    return (
        f"Hi {first_name},\n\n"
        f"Your {plan_label} subscription for TCG Pulse is now active.\n"
        f"Open your dashboard: {app_url}\n\n"
        f"You can manage billing from your account settings.\n"
    )


def send_subscription_success_email(to_email: str, first_name: str, plan_label: str) -> bool:
    """Send confirmation after a successful subscription checkout."""
    app_url = settings.FRONTEND_URL.rstrip("/") + "/home"
    subject = f"You are subscribed - {plan_label} | TCG Pulse"
    html = _build_subscription_success_html(first_name, plan_label, app_url)
    text = _build_subscription_success_text(first_name, plan_label, app_url)

    if _send_via_brevo(to_email, subject, html, text):
        return True

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
    if not msg["From"]:
        logger.warning("No SMTP_FROM/SMTP_USER for subscription success email")
        return False
    msg["To"] = to_email
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    if _send_via_smtp(to_email, msg):
        return True

    logger.warning("Could not send subscription success email to %s (no Brevo/SMTP)", to_email)
    return False


def send_verification_email(to_email: str, first_name: str, token: str) -> bool:
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    verify_url = f"{frontend_url}/verify?token={token}"

    subject = "Verify your email — TCG Pulse"
    html = _build_verification_html(first_name, verify_url)
    text = _build_verification_text(first_name, verify_url)

    # 1) Try Brevo API (HTTPS — free, no domain needed, works on cloud)
    if _send_via_brevo(to_email, subject, html, text):
        return True

    # 2) Try SMTP (works locally)
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
    msg["To"] = to_email
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    if _send_via_smtp(to_email, msg):
        return True

    # 3) Fallback: print link to console
    logger.warning(
        "No email transport available — verification link:\n  ➜  %s", verify_url,
    )
    return False
