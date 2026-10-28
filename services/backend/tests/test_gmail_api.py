"""
Gmail API transport with a mocked HTTP layer (no network, no database).

Run from services/backend:
DATABASE_URL=postgresql+asyncpg://x/y SECRET_KEY=x python -m pytest tests
"""
import base64
import email
import io
import json
from unittest import mock
from urllib.error import HTTPError

from app.config import settings
from app.core import email as mail
from app.core import gmail_api


class _Resp(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def _fake_urlopen(calls):
    def fake(req, timeout=None):
        calls.append(req)
        if req.full_url == gmail_api.TOKEN_URL:
            return _Resp(json.dumps({"access_token": "at-1", "expires_in": 3600}).encode())
        return _Resp(b'{"id": "m1"}')
    return fake


def _configure(monkeypatch):
    monkeypatch.setattr(settings, "GMAIL_CLIENT_ID", "cid")
    monkeypatch.setattr(settings, "GMAIL_CLIENT_SECRET", "secret")
    monkeypatch.setattr(settings, "GMAIL_REFRESH_TOKEN", "rt")
    monkeypatch.setattr(settings, "SMTP_USER", "pokemonmarketintel@gmail.com")
    monkeypatch.setattr(gmail_api, "_cached", (None, 0.0))


def test_sends_raw_message_with_bearer_token(monkeypatch):
    _configure(monkeypatch)
    calls = []
    with mock.patch.object(gmail_api, "urlopen", _fake_urlopen(calls)):
        assert mail.send_mail("sam@x.nl", "Onderwerp é", "<b>hoi</b>", "hoi", headers={"List-Unsubscribe": "<https://u>"})
        # second mail reuses the cached access token
        assert mail.send_mail("kim@x.nl", "Twee", "<b>2</b>", "2")
    assert [c.full_url for c in calls] == [gmail_api.TOKEN_URL, gmail_api.SEND_URL, gmail_api.SEND_URL]
    send = calls[1]
    assert send.get_header("Authorization") == "Bearer at-1"
    msg = email.message_from_bytes(base64.urlsafe_b64decode(json.loads(send.data)["raw"]))
    assert msg["To"] == "sam@x.nl"
    assert "pokemonmarketintel@gmail.com" in msg["From"]
    assert msg["List-Unsubscribe"] == "<https://u>"


def test_failed_token_refresh_returns_false(monkeypatch):
    _configure(monkeypatch)

    def fail(req, timeout=None):
        raise HTTPError(req.full_url, 400, "Bad Request", {}, io.BytesIO(b'{"error": "invalid_grant"}'))

    with mock.patch.object(gmail_api, "urlopen", fail):
        assert not mail.send_mail("sam@x.nl", "x", "<b>x</b>", "x")


def test_without_any_transport_nothing_is_sent(monkeypatch):
    for key in ("GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "SMTP_USER", "SMTP_PASSWORD"):
        monkeypatch.setattr(settings, key, "")
    assert not mail.send_mail("sam@x.nl", "x", "<b>x</b>", "x")
