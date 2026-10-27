"""Google OAuth 2.0 implementation for SpamGuard AI.

Follows official Google OAuth 2.0 guidelines with minimal read-only scopes:
- https://www.googleapis.com/auth/gmail.readonly
- openid
- https://www.googleapis.com/auth/userinfo.email
- https://www.googleapis.com/auth/userinfo.profile

Enforces anti-CSRF state tokens, HttpOnly session signing, and safe token revocation.
"""

from __future__ import annotations

import logging
import os
import secrets
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env", override=True)

logger = logging.getLogger("SpamGuardAI.Auth")

# OAuth Endpoints
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# Minimal Scopes (Strictly NO gmail.modify or mail.google.com)
GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

SESSION_COOKIE_NAME = "spamguard_auth_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7  # 7 days
STATE_MAX_AGE_SECONDS = 60 * 15  # 15 minutes


class GmailAuthManager:
    """Manages Google OAuth 2.0 authentication, session signing, and token lifecycle."""

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        redirect_uri: Optional[str] = None,
        session_secret: Optional[str] = None,
        frontend_url: Optional[str] = None,
    ) -> None:
        self.client_id = (
            client_id if client_id is not None else os.getenv("GOOGLE_CLIENT_ID", "").strip()
        )
        self.client_secret = (
            client_secret
            if client_secret is not None
            else os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
        )
        self.redirect_uri = (
            redirect_uri
            or os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback").strip()
        )
        self.frontend_url = (
            frontend_url or os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
        )

        secret = session_secret or os.getenv("APP_SESSION_SECRET", "")
        if not secret:
            # Deterministic warning for development fallback
            logger.warning("APP_SESSION_SECRET not set in environment. Using development secret key.")
            secret = "spamguard-ai-dev-insecure-secret-replace-in-production"
        self._serializer = URLSafeTimedSerializer(secret, salt="spamguard-gmail-oauth-v1")

    def is_configured(self) -> bool:
        """Verifies if Google OAuth credentials have been supplied and are not placeholders."""
        if not self.client_id or not self.client_secret:
            return False
        placeholders = {
            "your_client_id_here",
            "google_client_id",
            "placeholder",
            "xxx",
            "your_google_client_id.apps.googleusercontent.com",
            "your_google_client_secret",
        }
        if self.client_id.lower() in placeholders or self.client_secret.lower() in placeholders:
            return False
        return True

    def generate_state(self) -> str:
        """Generates a cryptographically random, timestamped, signed anti-CSRF state token."""
        random_nonce = secrets.token_urlsafe(24)
        payload = {"nonce": random_nonce, "created_at": time.time()}
        return self._serializer.dumps(payload)

    def validate_state(self, state_token: str) -> bool:
        """Validates that the received OAuth state parameter is genuine and unexpired."""
        if not state_token:
            return False
        try:
            payload = self._serializer.loads(state_token, max_age=STATE_MAX_AGE_SECONDS)
            return isinstance(payload, dict) and "nonce" in payload
        except (BadSignature, SignatureExpired):
            return False

    def get_authorization_url(self) -> Tuple[str, str]:
        """Constructs the Google OAuth 2.0 consent screen URL with secure state.

        Returns:
            Tuple of (authorization_url, state)
        """
        if not self.is_configured():
            raise ValueError(
                "Google OAuth credentials missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
            )

        state = self.generate_state()
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(GMAIL_SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
            "state": state,
        }
        return f"{GOOGLE_AUTH_URL}?{urlencode(params)}", state

    def exchange_code(self, code: str) -> Dict[str, Any]:
        """Exchanges an authorized OAuth authorization code for access and refresh tokens."""
        if not self.is_configured():
            raise ValueError("Google OAuth credentials missing.")

        payload = {
            "code": code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
        }

        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(GOOGLE_TOKEN_URL, data=payload)
                if resp.status_code != 200:
                    logger.error(
                        "OAuth code exchange failed with HTTP status %s",
                        resp.status_code,
                    )
                    error_detail = "Failed to exchange authorization code with Google."
                    try:
                        err_json = resp.json()
                        error_detail = err_json.get("error_description", error_detail)
                    except Exception:
                        pass
                    raise RuntimeError(error_detail)
                return resp.json()
        except httpx.RequestError as exc:
            logger.error("Network error during OAuth token exchange: %s", exc)
            raise RuntimeError(f"Connection to Google OAuth servers failed: {exc}")

    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Uses an authorized refresh token to obtain a fresh access token."""
        if not self.is_configured():
            raise ValueError("Google OAuth credentials missing.")
        if not refresh_token:
            raise ValueError("No refresh token provided.")

        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }

        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(GOOGLE_TOKEN_URL, data=payload)
                if resp.status_code != 200:
                    logger.warning("Token refresh failed with HTTP %s", resp.status_code)
                    raise RuntimeError("Unable to refresh Google access token. Please reconnect.")
                return resp.json()
        except httpx.RequestError as exc:
            raise RuntimeError(f"Connection to Google OAuth servers failed: {exc}")

    def fetch_user_info(self, access_token: str) -> Dict[str, Any]:
        """Retrieves user profile metadata (email, verified status) for identification."""
        headers = {"Authorization": f"Bearer {access_token}"}
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(GOOGLE_USERINFO_URL, headers=headers)
                if resp.status_code == 200:
                    return resp.json()
                logger.warning("Failed to fetch userinfo: HTTP %s", resp.status_code)
                return {"email": "Unknown User"}
        except Exception as exc:
            logger.warning("Error fetching user info: %s", exc)
            return {"email": "Unknown User"}

    def revoke_token(self, token: str) -> bool:
        """Revokes an access or refresh token with Google."""
        if not token:
            return True
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(GOOGLE_REVOKE_URL, params={"token": token})
                return resp.status_code == 200
        except Exception as exc:
            logger.warning("Error during token revocation: %s", exc)
            return False

    def create_session_token(self, session_data: Dict[str, Any]) -> str:
        """Serializes and cryptographically signs session data for HttpOnly cookies."""
        return self._serializer.dumps(session_data)

    def decode_session_token(self, token_str: str) -> Optional[Dict[str, Any]]:
        """Validates and decodes signed session data. Returns None if invalid or expired."""
        if not token_str:
            return None
        try:
            data = self._serializer.loads(token_str, max_age=SESSION_MAX_AGE_SECONDS)
            if isinstance(data, dict):
                return data
            return None
        except (BadSignature, SignatureExpired):
            return None


# Module-level default singleton
_auth_manager: Optional[GmailAuthManager] = None


def get_auth_manager() -> GmailAuthManager:
    """Returns the process-wide GmailAuthManager instance with up-to-date environment credentials."""
    global _auth_manager
    load_dotenv(PROJECT_ROOT / ".env", override=True)
    if _auth_manager is None:
        _auth_manager = GmailAuthManager()
    else:
        # Re-read credentials if updated in .env while process is active
        new_client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
        new_client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
        new_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "").strip()
        new_frontend_url = os.getenv("FRONTEND_URL", "").strip()

        if new_client_id:
            _auth_manager.client_id = new_client_id
        if new_client_secret:
            _auth_manager.client_secret = new_client_secret
        if new_redirect_uri:
            _auth_manager.redirect_uri = new_redirect_uri
        if new_frontend_url:
            _auth_manager.frontend_url = new_frontend_url.rstrip("/")

    return _auth_manager
