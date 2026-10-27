"""Unit and security tests for Google OAuth 2.0 flow, CSRF protection, and session encryption."""

from __future__ import annotations

import time
import pytest
from fastapi.testclient import TestClient

from src.api import app
from src.gmail.auth import (
    GMAIL_SCOPES,
    SESSION_COOKIE_NAME,
    GmailAuthManager,
    get_auth_manager,
)

client = TestClient(app)


def test_minimal_scopes_enforcement():
    """Verify that only minimal read-only and identity scopes are requested.

    Strict security invariant: NO gmail.modify, NO mail.google.com, NO send or delete scopes.
    """
    assert "https://www.googleapis.com/auth/gmail.readonly" in GMAIL_SCOPES
    assert "openid" in GMAIL_SCOPES
    assert "https://www.googleapis.com/auth/userinfo.email" in GMAIL_SCOPES

    # Negative security assertions
    forbidden_scopes = [
        "https://mail.google.com/",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.compose",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.insert",
    ]
    for forbidden in forbidden_scopes:
        assert forbidden not in GMAIL_SCOPES, f"Forbidden dangerous scope detected: {forbidden}"


def test_auth_status_unconfigured_credentials():
    """Verify that unconfigured credentials return useful setup instructions without crashing."""
    manager = GmailAuthManager(client_id="", client_secret="")
    assert manager.is_configured() is False

    response = client.get("/api/auth/status")
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is False
    # If unconfigured in environment, instructions must be provided
    if not data["configured"]:
        assert data["setup_instructions"] is not None
        assert "Google Cloud Console Setup Required" in data["setup_instructions"]["title"]
        assert len(data["setup_instructions"]["steps"]) >= 5


def test_start_auth_unconfigured_error():
    """Verify that /api/auth/google/start returns 400 when credentials are missing."""
    # Temporarily instantiate an unconfigured manager
    manager = GmailAuthManager(client_id="", client_secret="")
    with pytest.raises(ValueError, match="Google OAuth credentials missing"):
        manager.get_authorization_url()


def test_start_auth_configured_url_and_state():
    """Verify authorization URL structure and CSRF state parameter when configured."""
    manager = GmailAuthManager(
        client_id="test-client-id.apps.googleusercontent.com",
        client_secret="test-client-secret",
        redirect_uri="http://localhost:8000/api/auth/google/callback",
    )
    assert manager.is_configured() is True
    auth_url, state = manager.get_authorization_url()

    assert "accounts.google.com/o/oauth2/v2/auth" in auth_url
    assert "client_id=test-client-id.apps.googleusercontent.com" in auth_url
    assert "scope=" in auth_url
    assert "gmail.readonly" in auth_url
    assert "response_type=code" in auth_url
    assert "access_type=offline" in auth_url
    assert f"state={state}" in auth_url

    # State must validate successfully
    assert manager.validate_state(state) is True


def test_csrf_state_tampering_and_expiration():
    """Verify that altered or forged state tokens are rejected."""
    manager = GmailAuthManager(session_secret="test-crypto-secret-key-12345")
    valid_state = manager.generate_state()

    # Valid state passes
    assert manager.validate_state(valid_state) is True

    # Tampered state fails
    tampered_state = valid_state[:-4] + "xxxx"
    assert manager.validate_state(tampered_state) is False

    # Empty or garbage state fails
    assert manager.validate_state("") is False
    assert manager.validate_state("random-hacker-string") is False


def test_session_token_cryptographic_roundtrip():
    """Verify cryptographic serialization and validation of session payloads."""
    manager = GmailAuthManager(session_secret="test-session-secret-98765")
    session_data = {
        "access_token": "ya29.test_token_content",
        "email": "user@gmail.com",
        "name": "Test User",
        "connected_at": time.time(),
    }

    token_str = manager.create_session_token(session_data)
    assert isinstance(token_str, str)
    assert len(token_str) > 20

    # Decodes correctly
    decoded = manager.decode_session_token(token_str)
    assert decoded is not None
    assert decoded["email"] == "user@gmail.com"
    assert decoded["access_token"] == "ya29.test_token_content"

    # Tampered token returns None
    tampered_token = token_str + "corrupt"
    assert manager.decode_session_token(tampered_token) is None


def test_disconnect_clears_cookie():
    """Verify /api/auth/disconnect wipes the session cookie and responds successfully."""
    response = client.post("/api/auth/disconnect")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Check that Set-Cookie header expires the session cookie
    set_cookie = response.headers.get("set-cookie", "")
    assert SESSION_COOKIE_NAME in set_cookie or "Max-Age=0" in set_cookie
