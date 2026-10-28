"""
Email service for sending verification and notification emails.
Sends over SMTP (Gmail by default: SMTP_USER + an app password). Railway
allows outbound SMTP on the Pro plan only. These helpers block (smtplib):
call them through run_in_threadpool from async code.
"""

import html as html_module
import logging
import secrets
import smtplib
from typing import Dict, Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from datetime import datetime, timedelta, timezone

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


def send_mail(
    to_email: str,
    subject: str,
    html: str,
    text: str,
    *,
    reply_to: Optional[str] = None,
    headers: Optional[Dict[str, str]] = None,
    from_name: str = "TCG Pulse",
) -> bool:
    """Send one email over SMTP. Returns False (and logs why) when it can't."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP_USER/SMTP_PASSWORD not set: email to %s not sent", to_email)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr((from_name, settings.sender_email))
    msg["To"] = to_email
    if reply_to and "@" in reply_to:
        msg["Reply-To"] = reply_to.strip()
    for name, value in (headers or {}).items():
        msg[name] = value
    msg.attach(MIMEText(text or subject, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    # SMTP_PORT first, then the other standard port (465 = SSL, else STARTTLS)
    ports = [settings.SMTP_PORT] + [p for p in (465, 587) if p != settings.SMTP_PORT]
    for port in ports:
        try:
            if port == 465:
                with smtplib.SMTP_SSL(settings.SMTP_HOST, port, timeout=15) as server:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(settings.SMTP_HOST, port, timeout=15) as server:
                    server.starttls()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.send_message(msg)
            logger.info("Email sent via SMTP to %s (port %d)", to_email, port)
            return True
        except smtplib.SMTPAuthenticationError as exc:
            logger.error("SMTP login failed for %s: %s", settings.SMTP_USER, exc)
            return False
        except Exception as exc:
            logger.warning("SMTP port %d failed for %s: %s", port, to_email, exc)
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

    return send_mail(to_email, subject, html, text)


def send_verification_email(to_email: str, first_name: str, token: str) -> bool:
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    verify_url = f"{frontend_url}/verify?token={token}"

    subject = "Bevestig je e-mailadres voor TCG Pulse"
    html = _build_verification_html(first_name, verify_url)
    text = _build_verification_text(first_name, verify_url)

    if send_mail(to_email, subject, html, text):
        return True
    # The register endpoint then shows the link on screen instead
    logger.warning("Verification email not sent to %s", to_email)
    return False


def send_password_reset_email(to_email: str, first_name: str, reset_url: str, minutes: int) -> bool:
    """Mail a link to choose a new password."""
    name = html_module.escape(first_name)
    subject = "Nieuw wachtwoord instellen voor TCG Pulse"
    html = f"""<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#111827 0%,#1f2937 100%);padding:28px 40px;text-align:center;">
          <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;">TCG Pulse</h1>
        </td></tr>
        <tr><td style="padding:36px 40px 20px;">
          <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 8px;">Hoi {name},</h2>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 28px;">
            Je hebt gevraagd om een nieuw wachtwoord. Klik op de knop om er een te kiezen.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:0 0 28px;">
              <a href="{reset_url}" target="_blank" style="display:inline-block;background:#111827;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;">
                Nieuw wachtwoord kiezen
              </a>
            </td></tr>
          </table>
          <p style="color:#9ca3af;font-size:13px;line-height:1.5;margin:0 0 24px;">
            Of kopieer deze link in je browser:<br/>
            <a href="{reset_url}" style="color:#4f46e5;word-break:break-all;font-size:12px;">{reset_url}</a>
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;">
            De link is {minutes} minuten geldig en werkt één keer. Heb je dit niet aangevraagd? Dan kun je deze mail negeren: je wachtwoord blijft hetzelfde.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    text = (
        f"Hoi {first_name},\n\n"
        f"Je hebt gevraagd om een nieuw wachtwoord voor TCG Pulse. Kies er een via deze link:\n\n"
        f"{reset_url}\n\n"
        f"De link is {minutes} minuten geldig en werkt één keer.\n"
        f"Heb je dit niet aangevraagd? Dan kun je deze mail negeren: je wachtwoord blijft hetzelfde."
    )
    return send_mail(to_email, subject, html, text)


def send_feedback_inbox_email(
    submitter_email: Optional[str],
    feedback_type: str,
    message: str,
) -> bool:
    """Notify the product inbox about user feedback."""
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

    if send_mail(to_addr, subject, html, text, reply_to=submitter_email):
        logger.info("Feedback email sent to inbox %s", to_addr)
        return True
    logger.error("Feedback email NOT delivered to %s (see the SMTP log lines above)", to_addr)
    return False
