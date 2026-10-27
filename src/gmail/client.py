"""Minimal Read-Only Google Gmail API Client.

Interfaces directly with Google Gmail REST API v1 endpoints.
Enforces read-only permissions and safe bounds.
Strictly NEVER implements or calls mutating endpoints (no send, delete, trash, or modify).
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
import httpx

logger = logging.getLogger("SpamGuardAI.GmailClient")

GMAIL_BASE_URL = "https://gmail.googleapis.com/gmail/v1/users/me"


class GmailApiError(Exception):
    """Base exception for Gmail API communication errors."""

    def __init__(self, message: str, status_code: int = 500) -> None:
        super().__init__(message)
        self.status_code = status_code


class GmailAuthError(GmailApiError):
    """Raised when the OAuth token is invalid, revoked, or expired."""

    def __init__(self, message: str = "Gmail authorization expired or invalid.") -> None:
        super().__init__(message, status_code=401)


class GmailPermissionError(GmailApiError):
    """Raised when insufficient scopes or permission errors occur."""

    def __init__(self, message: str = "Insufficient permissions to read Gmail inbox.") -> None:
        super().__init__(message, status_code=403)


class GmailRateLimitError(GmailApiError):
    """Raised when Google API quota or rate limits are reached."""

    def __init__(self, message: str = "Google Gmail API rate limit reached. Please wait before retrying.") -> None:
        super().__init__(message, status_code=429)


class GmailClient:
    """Read-only Gmail REST API client authenticated with a bearer token."""

    def __init__(self, access_token: str, timeout: float = 15.0) -> None:
        if not access_token:
            raise GmailAuthError("Access token required to initialize GmailClient.")
        self.access_token = access_token
        self.timeout = timeout

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json",
        }

    def _handle_response(self, resp: httpx.Response) -> Dict[str, Any]:
        if resp.status_code == 200:
            return resp.json()
        if resp.status_code == 401:
            logger.warning("Gmail API returned 401 Unauthorized")
            raise GmailAuthError("Google session expired. Please re-authenticate.")
        if resp.status_code == 403:
            logger.warning("Gmail API returned 403 Forbidden")
            raise GmailPermissionError("Access forbidden. Ensure the 'gmail.readonly' scope is granted.")
        if resp.status_code == 429:
            logger.warning("Gmail API returned 429 Rate Limit")
            raise GmailRateLimitError()

        logger.error("Gmail API returned error status HTTP %s", resp.status_code)
        raise GmailApiError(
            f"Gmail API request failed with status HTTP {resp.status_code}.",
            status_code=resp.status_code,
        )

    def list_messages(
        self,
        query: str = "",
        max_results: int = 20,
        page_token: Optional[str] = None,
        label_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Lists message references in the user's mailbox.

        Enforces a safety maximum of 50 messages per batch to prevent mailbox-wide scans.
        """
        # Safety bound: default 20, max 50
        bounded_max = max(1, min(max_results, 50))
        params: Dict[str, Any] = {"maxResults": bounded_max}

        if query:
            params["q"] = query
        if page_token:
            params["pageToken"] = page_token
        if label_ids:
            params["labelIds"] = label_ids

        url = f"{GMAIL_BASE_URL}/messages"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(url, headers=self._headers(), params=params)
                return self._handle_response(resp)
        except httpx.RequestError as exc:
            logger.error("Network error while listing Gmail messages: %s", exc)
            raise GmailApiError(f"Network error communicating with Gmail: {exc}")

    def get_message(self, message_id: str, format_type: str = "full") -> Dict[str, Any]:
        """Retrieves a single message by ID. Format defaults to 'full' for MIME payload parsing."""
        if not message_id or not isinstance(message_id, str):
            raise ValueError("Valid message_id string required.")

        url = f"{GMAIL_BASE_URL}/messages/{message_id}"
        params = {"format": format_type}

        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(url, headers=self._headers(), params=params)
                return self._handle_response(resp)
        except httpx.RequestError as exc:
            logger.error("Network error retrieving Gmail message %s: %s", message_id, exc)
            raise GmailApiError(f"Network error retrieving message: {exc}")

    def get_messages_batch(self, message_ids: List[str]) -> List[Dict[str, Any]]:
        """Retrieves full details for a bounded list of message IDs."""
        bounded_ids = message_ids[:50]
        results: List[Dict[str, Any]] = []

        # Retrieve each message individually
        for mid in bounded_ids:
            try:
                msg_data = self.get_message(mid)
                results.append(msg_data)
            except Exception as exc:
                logger.warning("Failed to fetch message ID %s: %s", mid, exc)
                continue

        return results
