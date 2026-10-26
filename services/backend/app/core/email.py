"""
Email service for sending verification and notification emails.
Uses the Brevo HTTPS API with SMTP fallback. These helpers block (urllib /
smtplib): call them through run_in_threadpool from async code.
"""

import html as html_module
import logging
import secrets
import smtplib
import json
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from app.config import settings

logger = logging.getLogger(__name__)

VERIFICATION_TOKEN_HOURS = 48


def generate_verification_token() -> tuple[str, datetime]:
    token = secrets.token_urlsafe(48)
    expires = datetime.now(timezone.utc) + timedelta(hours=VERIFICATION_TOKEN_HOURS)
    return token, expires


def _build_verification_html(first_name: str, verify_url: str) -> str:
    first_name = html_module.escape(first_name)
    return f"""<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#111827 0%,#1f2937 100%);padding:36px 40px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;"><tr><td style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#6d28d9);text-align:center;vertical-align:middle;padding:8px;">
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='18' fill='%23fafafa'/%3E%3Cpath d='M20 2c9.94 0 18 8.06 18 18H2c0-9.94 8.06-18 18-18z' fill='%23dc2626'/%3E%3Crect x='2' y='19' width='36' height='2' fill='%23111827'/%3E%3Ccircle cx='20' cy='20' r='7' fill='%23fff' stroke='%23111827' stroke-width='2'/%3E%3Ccircle cx='20' cy='20' r='3' fill='%23111827'/%3E%3C/svg%3E" width="40" height="40" alt="" style="display:block;margin:0 auto;" />
          </td></tr></table>
          <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;letter-spacing:-0.3px;">TCG Pulse</h1>
          <p style="color:#9ca3af;font-size:13px;margin:6px 0 0;">Eerlijke Pokémon-prijzen in Europa</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px 20px;">
          <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 8px;">Welkom, {first_name}!</h2>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 28px;">
            Leuk dat je er bent. Bevestig je e-mailadres om je account te activeren: dan kun je deals bekijken, prijzen checken en prijsalerts instellen.
          </p>

          <!-- CTA Button -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:0 0 28px;">
              <a href="{verify_url}" target="_blank" style="display:inline-block;background:#111827;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;letter-spacing:0.2px;">
                E-mailadres bevestigen
              </a>
            </td></tr>
          </table>

          <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0 0 24px;">
            Of kopieer deze link in je browser:<br/>
            <a href="{verify_url}" style="color:#4f46e5;word-break:break-all;font-size:12px;">{verify_url}</a>
          </p>
        </td></tr>

        <!-- Feature highlights -->
        <tr><td style="padding:0 40px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:20px 24px;">
            <tr><td>
              <p style="color:#374151;font-size:14px;font-weight:600;margin:0 0 12px;">Hier heb je toegang toe:</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:6px 0;color:#111827;font-size:14px;" width="28">&#9889;</td>
                  <td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Topdeals:</strong> kaarten onder de normale prijs</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#111827;font-size:14px;">&#128200;</td>
                  <td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Prijscheck:</strong> zie direct of een prijs eerlijk is</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#111827;font-size:14px;">&#127919;</td>
                  <td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Lijstprijs:</strong> je hele lijst inclusief verzending</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#111827;font-size:14px;">&#128276;</td>
                  <td style="padding:6px 0;color:#374151;font-size:14px;"><strong>Prijsalerts:</strong> een mail zodra je doelprijs bereikt is</td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;">
            Deze link is {VERIFICATION_TOKEN_HOURS} uur geldig. Heb je geen account aangemaakt? Dan kun je deze mail negeren.
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
        f"Welkom, {first_name}!\n\n"
        f"Leuk dat je je hebt aangemeld bij TCG Pulse.\n"
        f"Bevestig je e-mailadres via deze link:\n\n"
        f"{verify_url}\n\n"
        f"De link is {VERIFICATION_TOKEN_HOURS} uur geldig.\n"
        f"Heb je geen account aangemaakt? Dan kun je deze mail negeren."
    )


def _send_via_brevo(
    to_email: str,
    subject: str,
    html: str,
    text: str,
    *,
    reply_to_email: Optional[str] = None,
) -> bool:
    """Send email via Brevo (Sendinblue) HTTPS API (free tier, no domain required)."""
    api_key = settings.BREVO_API_KEY
    if not api_key:
        return False

    sender_email = settings.sender_email

    body: dict = {
        "sender": {"name": "TCG Pulse", "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html,
        "textContent": text,
    }
    if reply_to_email and "@" in reply_to_email:
        body["replyTo"] = {
            "email": reply_to_email.strip(),
            "name": reply_to_email.split("@", 1)[0][:78],
        }

    payload = json.dumps(body).encode()

    req = Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload,
        headers={
            "api-key": api_key,
            "Content-Type": "application/json",
        },
    )

    try:
        with urlopen(req, timeout=15) as resp:
            logger.info("Email sent via Brevo to %s (status %d)", to_email, resp.status)
            return True
    except HTTPError as exc:
        try:
            err_body = exc.read().decode(errors="replace")
        except Exception:
            err_body = str(exc)
        logger.warning(
            "Brevo HTTP %s for %s: %s",
            exc.code,
            to_email,
            err_body[:2500],
        )
        return False
    except URLError as exc:
        logger.warning("Brevo API failed for %s: %s", to_email, exc)
        return False


def _send_via_smtp(to_email: str, msg: MIMEMultipart) -> bool:
    """Send email via SMTP (works locally; often blocked on cloud)."""
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
    first_name = html_module.escape(first_name)
    return f"""<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#111827 0%,#1f2937 100%);padding:36px 40px;text-align:center;">
          <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;">TCG Pulse</h1>
          <p style="color:#9ca3af;font-size:13px;margin:8px 0 0;">Abonnement actief</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 12px;">Gelukt, {first_name}!</h2>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 20px;">
            Je <strong style="color:#111827;">{plan_label}</strong>-abonnement is actief. Je hebt nu toegang tot alle deals, de volledige prijsgeschiedenis en de rest van je abonnement.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:0 0 24px;">
              <a href="{app_url}" target="_blank" style="display:inline-block;background:#111827;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;">
                Naar je dashboard
              </a>
            </td></tr>
          </table>
          <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0;">
            Je betaalgegevens en facturen beheer je altijd via je instellingen (betaalportaal van Stripe).
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
        f"Hoi {first_name},\n\n"
        f"Je {plan_label}-abonnement voor TCG Pulse is actief.\n"
        f"Naar je dashboard: {app_url}\n\n"
        f"Je betaalgegevens beheer je via je instellingen.\n"
    )


def send_subscription_success_email(to_email: str, first_name: str, plan_label: str) -> bool:
    """Send confirmation after a successful subscription checkout."""
    app_url = settings.FRONTEND_URL.rstrip("/") + "/home"
    subject = f"Je {plan_label}-abonnement is actief · TCG Pulse"
    html = _build_subscription_success_html(first_name, plan_label, app_url)
    text = _build_subscription_success_text(first_name, plan_label, app_url)

    if _send_via_brevo(to_email, subject, html, text):
        return True

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.sender_email
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

    subject = "Bevestig je e-mailadres voor TCG Pulse"
    html = _build_verification_html(first_name, verify_url)
    text = _build_verification_text(first_name, verify_url)

    # 1) Try Brevo API (HTTPS, works on cloud)
    if _send_via_brevo(to_email, subject, html, text):
        return True

    # 2) Try SMTP (works locally)
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.sender_email
    msg["To"] = to_email
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    if _send_via_smtp(to_email, msg):
        return True

    # 3) Fallback: print link to console
    logger.warning(
        "No email transport available. Verification link:\n  %s", verify_url,
    )
    return False


def send_feedback_inbox_email(
    submitter_email: Optional[str],
    feedback_type: str,
    message: str,
) -> bool:
    """Notify product inbox about user feedback (Brevo API, then SMTP)."""
    to_addr = (settings.FEEDBACK_INBOX_EMAIL or "").strip()
    if not to_addr:
        logger.info(
            "Feedback (set FEEDBACK_INBOX_EMAIL to receive by mail): type=%s from=%s — %s",
            feedback_type,
            submitter_email,
            message[:2000],
        )
        return False

    subject = f"[TCG Pulse Feedback] {feedback_type}"
    safe_msg = message.strip()
    esc = html_module.escape
    text = (
        f"Type: {feedback_type}\n"
        f"From: {submitter_email or '(unknown)'}\n\n"
        f"{safe_msg}\n"
    )
    html = f"""<!DOCTYPE html><html><body style="font-family:sans-serif;font-size:14px;color:#111827;">
<p><strong>Type:</strong> {esc(feedback_type)}</p>
<p><strong>From:</strong> {esc(submitter_email or "(unknown)")}</p>
<pre style="white-space:pre-wrap;background:#f9fafb;padding:16px;border-radius:8px;">{esc(safe_msg)}</pre>
</body></html>"""

    if _send_via_brevo(
        to_addr,
        subject,
        html,
        text,
        reply_to_email=submitter_email,
    ):
        logger.info("Feedback email sent via Brevo to inbox %s", to_addr)
        return True

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.sender_email
    if not msg["From"]:
        logger.error(
            "Feedback email failed: no BREVO_API_KEY and no SMTP_FROM/SMTP_USER. "
            "Set BREVO_API_KEY on the backend (same as verification emails), or configure SMTP.",
        )
        return False
    msg["To"] = to_addr
    if submitter_email and "@" in submitter_email:
        msg["Reply-To"] = submitter_email.strip()
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    if _send_via_smtp(to_addr, msg):
        logger.info("Feedback email sent via SMTP to inbox %s", to_addr)
        return True

    logger.error(
        "Feedback email NOT delivered to %s. Check Railway logs above for Brevo HTTP errors, "
        "or SMTP failures. Confirm BREVO_API_KEY and a verified sender in Brevo.",
        to_addr,
    )
    return False
