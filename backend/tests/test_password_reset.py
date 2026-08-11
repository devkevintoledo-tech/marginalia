"""Password recovery flow: forgot-password (anti-enumeration) → reset-password.

Email delivery is faked via dependency override (no SMTP, no network). Google
Books is never touched here. Uses the shared conftest fixtures (client, db).
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.config import settings
from app.main import app
from app.models import AuthProvider, User
from app.models.password_reset import PasswordResetToken
from app.services.auth import hash_password
from app.services.email import (
    ConsoleEmailSender,
    EmailSender,
    SmtpEmailSender,
    email_sender_dep,
    get_email_sender,
)


class FakeEmailSender(EmailSender):
    def __init__(self):
        self.sent: list[tuple[str, str]] = []

    async def send_password_reset(self, to_email: str, reset_url: str) -> None:
        self.sent.append((to_email, reset_url))


@pytest_asyncio.fixture
async def fake_email():
    sender = FakeEmailSender()
    app.dependency_overrides[email_sender_dep] = lambda: sender
    yield sender
    app.dependency_overrides.pop(email_sender_dep, None)


def _token_from_url(url: str) -> str:
    from urllib.parse import urlparse, parse_qs

    qs = parse_qs(urlparse(url).query)
    return qs["token"][0]


async def _register(client, email="reset@example.com", username="resetuser", password="hunter2hunter2"):
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "username": username, "password": password},
    )
    assert resp.status_code == 201, resp.text
    return resp


async def test_forgot_password_existing_user_sends_one_email(client, fake_email):
    await _register(client)
    resp = await client.post("/api/auth/forgot-password", json={"email": "reset@example.com"})
    assert resp.status_code == 200, resp.text
    assert len(fake_email.sent) == 1
    to_email, reset_url = fake_email.sent[0]
    assert to_email == "reset@example.com"
    assert "token=" in reset_url
    assert _token_from_url(reset_url)


async def test_forgot_password_unknown_email_no_email_no_row(client, fake_email, db_session):
    resp = await client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
    assert resp.status_code == 200, resp.text
    assert fake_email.sent == []
    rows = (await db_session.execute(select(PasswordResetToken))).scalars().all()
    assert rows == []


async def test_forgot_password_oauth_only_user_no_email(client, fake_email, db_session):
    user = User(
        email="oauth@example.com",
        username="oauthuser",
        auth_provider=AuthProvider.google,
        password_hash=None,
    )
    db_session.add(user)
    await db_session.commit()

    resp = await client.post("/api/auth/forgot-password", json={"email": "oauth@example.com"})
    assert resp.status_code == 200, resp.text
    assert fake_email.sent == []


async def test_reset_password_happy_path(client, fake_email):
    await _register(client, password="oldpassword123")
    await client.post("/api/auth/forgot-password", json={"email": "reset@example.com"})
    token = _token_from_url(fake_email.sent[0][1])

    resp = await client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "newpassword456"},
    )
    assert resp.status_code == 200, resp.text

    old = await client.post(
        "/api/auth/login",
        json={"email": "reset@example.com", "password": "oldpassword123"},
    )
    assert old.status_code == 401

    new = await client.post(
        "/api/auth/login",
        json={"email": "reset@example.com", "password": "newpassword456"},
    )
    assert new.status_code == 200, new.text


async def test_reset_password_garbage_token(client):
    resp = await client.post(
        "/api/auth/reset-password",
        json={"token": "not-a-real-token", "new_password": "newpassword456"},
    )
    assert resp.status_code == 400


async def test_reset_password_expired_token(client, db_session):
    from app.services.auth import generate_reset_token

    user = User(
        email="expired@example.com",
        username="expireduser",
        auth_provider=AuthProvider.email,
        password_hash=hash_password("oldpassword123"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    raw, token_hash = generate_reset_token()
    row = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    db_session.add(row)
    await db_session.commit()

    resp = await client.post(
        "/api/auth/reset-password",
        json={"token": raw, "new_password": "newpassword456"},
    )
    assert resp.status_code == 400


async def test_reset_password_reused_token(client, fake_email):
    await _register(client, password="oldpassword123")
    await client.post("/api/auth/forgot-password", json={"email": "reset@example.com"})
    token = _token_from_url(fake_email.sent[0][1])

    first = await client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "newpassword456"},
    )
    assert first.status_code == 200, first.text

    second = await client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "anotherpassword789"},
    )
    assert second.status_code == 400


async def test_reset_password_too_short(client, fake_email):
    await _register(client)
    await client.post("/api/auth/forgot-password", json={"email": "reset@example.com"})
    token = _token_from_url(fake_email.sent[0][1])

    resp = await client.post(
        "/api/auth/reset-password",
        json={"token": token, "new_password": "short"},
    )
    assert resp.status_code == 422


def test_get_email_sender_selects_by_smtp_host(monkeypatch):
    monkeypatch.setattr(settings, "SMTP_HOST", "")
    assert isinstance(get_email_sender(), ConsoleEmailSender)

    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    assert isinstance(get_email_sender(), SmtpEmailSender)
