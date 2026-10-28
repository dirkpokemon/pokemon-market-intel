"""
Async wrapper around the SMTP sender in app.core.email (used by the digest).
"""
import asyncio
from typing import Optional

from app.core.email import send_mail


async def send_email(
    to_email: str,
    subject: str,
    html: str,
    text: str = "",
    unsubscribe_url: Optional[str] = None,
) -> bool:
    """Send an email. Returns True on success.

    unsubscribe_url adds a List-Unsubscribe header so mail clients show an
    "unsubscribe" button that opens the frontend /unsubscribe page.
    """
    headers = {"List-Unsubscribe": f"<{unsubscribe_url}>"} if unsubscribe_url else None
    return await asyncio.to_thread(send_mail, to_email, subject, html, text, headers=headers)
