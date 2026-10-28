"""
Send mail through the Gmail API over HTTPS.

Railway's Hobby plan blocks outbound SMTP, but HTTPS works, and the Gmail API
sends as the Gmail account itself (no DMARC problem, unlike third-party
providers sending "as" @gmail.com). It needs an OAuth client of a Google
Cloud project with the Gmail API enabled and a refresh token for the
gmail.send scope (see docs/email-gmail-api.md). The analysis service keeps an
identical copy of this module in app/gmail_api.py.
"""

import base64
import json
import logging
import threading
import time
from email.message import Message
from typing import Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)

TOKEN_URL = "https://oauth2.googleapis.com/token"
SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"

_lock = threading.Lock()
_cached: Tuple[Optional[str], float] = (None, 0.0)  # (access token, expires at)


def _access_token(client_id: str, client_secret: str, refresh_token: str) -> Optional[str]:
    """Access token from the refresh token, cached until a minute before it expires."""
    global _cached
    with _lock:
        token, expires_at = _cached
        if token and time.time() < expires_at - 60:
            return token
        body = urlencode({
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }).encode()
        try:
            with urlopen(Request(TOKEN_URL, data=body), timeout=15) as resp:
                data = json.load(resp)
        except HTTPError as exc:
            # invalid_grant = refresh token revoked or expired (an OAuth app left in
            # "Testing" issues tokens that expire after 7 days)
            logger.error("Gmail API token refresh failed (HTTP %s): %s", exc.code, exc.read().decode(errors="replace")[:500])
            return None
        except (URLError, OSError, ValueError) as exc:
            logger.error("Gmail API token refresh failed: %s", exc)
            return None
        _cached = (data["access_token"], time.time() + int(data.get("expires_in", 3600)))
        return _cached[0]


def send(msg: Message, client_id: str, client_secret: str, refresh_token: str) -> bool:
    """Send a ready-built MIME message. Returns False (and logs why) on failure."""
    token = _access_token(client_id, client_secret, refresh_token)
    if not token:
        return False
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    req = Request(
        SEND_URL,
        data=json.dumps({"raw": raw}).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    try:
        with urlopen(req, timeout=20) as resp:
            resp.read()
        return True
    except HTTPError as exc:
        logger.error("Gmail API send to %s failed (HTTP %s): %s", msg["To"], exc.code, exc.read().decode(errors="replace")[:500])
    except (URLError, OSError) as exc:
        logger.error("Gmail API send to %s failed: %s", msg["To"], exc)
    return False
