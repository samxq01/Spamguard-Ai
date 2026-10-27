"""SpamGuard AI — Minimal-Scope Gmail Integration and Parser Module."""

from src.gmail.auth import (
    GMAIL_SCOPES,
    SESSION_COOKIE_NAME,
    GmailAuthManager,
    get_auth_manager,
)
from src.gmail.client import (
    GmailApiError,
    GmailAuthError,
    GmailClient,
    GmailPermissionError,
    GmailRateLimitError,
)
from src.gmail.parser import (
    ParsedEmailContent,
    parse_gmail_message_payload,
    parse_raw_mime_string,
    strip_html_to_plain_text,
)
from src.gmail.scanner import (
    GmailScanner,
    GmailScanResult,
    GmailScanSummary,
    ScannedEmailResult,
)

__all__ = [
    "GMAIL_SCOPES",
    "SESSION_COOKIE_NAME",
    "GmailAuthManager",
    "get_auth_manager",
    "GmailClient",
    "GmailApiError",
    "GmailAuthError",
    "GmailPermissionError",
    "GmailRateLimitError",
    "ParsedEmailContent",
    "parse_gmail_message_payload",
    "parse_raw_mime_string",
    "strip_html_to_plain_text",
    "GmailScanner",
    "GmailScanResult",
    "GmailScanSummary",
    "ScannedEmailResult",
]
