"""
Email utility — Brevo API (primary) with SMTP fallback.
"""
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


async def send_email(to_email: str, subject: str, html: str, text: str = "") -> bool:
    """Send an email. Returns True on success."""
    if settings.BREVO_API_KEY:
        return await _send_via_brevo(to_email, subject, html, text)
    elif settings.SMTP_HOST:
        return _send_via_smtp(to_email, subject, html, text)
    else:
        logger.warning(f"No email provider configured — skipping email to {to_email}")
        return False


async def _send_via_brevo(to_email: str, subject: str, html: str, text: str) -> bool:
    payload = {
        "sender": {
            "name": "TCG Pulse",
            "email": settings.SMTP_FROM or "noreply@tcgpulse.com",
        },
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html,
        "textContent": text or subject,
    }
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                BREVO_API_URL,
                json=payload,
                headers={
                    "api-key": settings.BREVO_API_KEY,
                    "Content-Type": "application/json",
                },
                timeout=15.0,
            )
            if r.status_code in (200, 201, 202):
                logger.info(f"Email sent via Brevo to {to_email}")
                return True
            logger.error(f"Brevo error {r.status_code}: {r.text}")
            return False
    except Exception as e:
        logger.error(f"Brevo send failed: {e}")
        return False


def _send_via_smtp(to_email: str, subject: str, html: str, text: str) -> bool:
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
        msg["To"] = to_email
        if text:
            msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))
        ctx = ssl.create_default_context()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls(context=ctx)
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(msg["From"], [to_email], msg.as_string())
        logger.info(f"Email sent via SMTP to {to_email}")
        return True
    except Exception as e:
        logger.error(f"SMTP send failed: {e}")
        return False
