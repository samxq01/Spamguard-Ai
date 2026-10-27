"""Unit tests for safe MIME parsing, RFC 2047 header decoding, and HTML email sanitization."""

from __future__ import annotations

import base64
import pytest

from src.gmail.parser import (
    MAX_PARSED_CHARS,
    decode_mime_header_value,
    parse_gmail_message_payload,
    parse_raw_mime_string,
    strip_html_to_plain_text,
)


def test_decode_mime_header_value():
    """Verify RFC 2047 encoded-word decoding for UTF-8 and ISO-8859-1 headers."""
    # Plain ascii
    assert decode_mime_header_value("Simple Subject Line") == "Simple Subject Line"

    # UTF-8 Base64 encoded: "Important Notification"
    b64_utf8 = "=?UTF-8?B?SW1wb3J0YW50IE5vdGlmaWNhdGlvbg==?="
    assert decode_mime_header_value(b64_utf8) == "Important Notification"

    # UTF-8 Q-encoded: "Security Alert: Urgent"
    q_utf8 = "=?UTF-8?Q?Security_Alert:_Urgent?="
    assert decode_mime_header_value(q_utf8) == "Security Alert: Urgent"

    # Empty and None values
    assert decode_mime_header_value("") == ""
    assert decode_mime_header_value(None) == ""


def test_strip_html_to_plain_text_script_and_style_removal():
    """Verify script tags, style sheets, comments, and dangerous tags are stripped."""
    malicious_html = """
    <html>
      <head>
        <style>body { color: red; }</style>
        <script>alert('pwned'); window.location='http://evil.com';</script>
      </head>
      <body>
        <!-- Secret phishing comment -->
        <h1>Account Notice</h1>
        <p>Dear valued customer,<br>Your access will expire in 24 hours.</p>
        <script type="text/javascript">document.write('dangerous');</script>
        <a href="http://phish.example.com">Click Here &amp; Verify</a>
      </body>
    </html>
    """
    clean_text = strip_html_to_plain_text(malicious_html)

    # Active code must be purged completely
    assert "alert" not in clean_text
    assert "pwned" not in clean_text
    assert "color: red" not in clean_text
    assert "Secret phishing comment" not in clean_text
    assert "document.write" not in clean_text
    assert "<h1>" not in clean_text
    assert "<script" not in clean_text

    # Legitimate textual content must be preserved
    assert "Account Notice" in clean_text
    assert "Dear valued customer" in clean_text
    assert "Your access will expire in 24 hours." in clean_text
    assert "Click Here & Verify" in clean_text


def test_strip_html_entity_decoding():
    """Verify HTML entities are properly unescaped to plain text characters."""
    raw = "&quot;Special Deal&quot; &amp; Save &euro;50 now! &lt;Limited Time&gt;"
    res = strip_html_to_plain_text(raw)
    assert res == '"Special Deal" & Save €50 now! <Limited Time>'


def test_strip_html_oversized_bound():
    """Verify oversized HTML inputs are truncated to prevent memory exhaustion."""
    giant_html = "<p>Repeat content </p>" * 100_000
    cleaned = strip_html_to_plain_text(giant_html)
    assert len(cleaned) <= MAX_PARSED_CHARS


def test_parse_gmail_message_payload_plain_text():
    """Verify parsing a standard Gmail API JSON resource with plain text payload."""
    raw_body = "Hello team, here is the weekly engineering sprint report."
    encoded_body = base64.urlsafe_b64encode(raw_body.encode("utf-8")).decode("ascii")

    msg = {
        "id": "1894a8f9b1e2c3d4",
        "threadId": "1894a8f9b1e2c3d4",
        "snippet": "Hello team, here is the weekly engineering sprint...",
        "payload": {
            "mimeType": "text/plain",
            "headers": [
                {"name": "Subject", "value": "Sprint 35 Planning Update"},
                {"name": "From", "value": "Alice Smith <alice@example.com>"},
                {"name": "To", "value": "team@example.com"},
                {"name": "Date", "value": "Tue, 27 Oct 2026 10:00:00 +0000"},
            ],
            "body": {
                "size": len(raw_body),
                "data": encoded_body,
            },
        },
    }

    parsed = parse_gmail_message_payload(msg)
    assert parsed.subject == "Sprint 35 Planning Update"
    assert "Alice Smith" in parsed.sender
    assert parsed.plain_body == raw_body
    assert parsed.has_html is False
    assert parsed.has_attachments is False


def test_parse_gmail_message_payload_multipart_alternative():
    """Verify preference for plain text part in multipart/alternative payloads."""
    plain_text = "Plain text version of email notification."
    html_text = "<p><strong>HTML version</strong> of email notification.</p>"

    b64_plain = base64.urlsafe_b64encode(plain_text.encode("utf-8")).decode("ascii")
    b64_html = base64.urlsafe_b64encode(html_text.encode("utf-8")).decode("ascii")

    msg = {
        "id": "msg_multipart_123",
        "snippet": "Plain text version...",
        "payload": {
            "mimeType": "multipart/alternative",
            "headers": [
                {"name": "Subject", "value": "Important Billing Receipt"},
                {"name": "From", "value": "billing@cloud.service.com"},
            ],
            "parts": [
                {
                    "mimeType": "text/plain",
                    "body": {"data": b64_plain},
                },
                {
                    "mimeType": "text/html",
                    "body": {"data": b64_html},
                },
            ],
        },
    }

    parsed = parse_gmail_message_payload(msg)
    assert parsed.subject == "Important Billing Receipt"
    assert parsed.plain_body == plain_text
    assert parsed.has_html is True


def test_parse_gmail_message_payload_html_only():
    """Verify fallback to safe HTML sanitization when plain text part is absent."""
    html_text = "<div><h2>Special Discount</h2><p>Click here to claim 50% discount on shoes.</p></div>"
    b64_html = base64.urlsafe_b64encode(html_text.encode("utf-8")).decode("ascii")

    msg = {
        "id": "msg_html_only_456",
        "snippet": "Special Discount...",
        "payload": {
            "mimeType": "text/html",
            "headers": [
                {"name": "Subject", "value": "50% Off Flash Sale"},
                {"name": "From", "value": "deals@store.com"},
            ],
            "body": {"data": b64_html},
        },
    }

    parsed = parse_gmail_message_payload(msg)
    assert parsed.subject == "50% Off Flash Sale"
    assert "Special Discount" in parsed.plain_body
    assert "Click here to claim 50% discount on shoes." in parsed.plain_body
    assert "<div" not in parsed.plain_body


def test_parse_raw_mime_string():
    """Verify parsing raw RFC 2822 email string."""
    raw_eml = """From: security@bank.com
To: victim@example.com
Subject: =?UTF-8?B?VXJnZW50OiBBY2NvdW50IFN1c3BlbmRlZA==?=
Date: Mon, 26 Oct 2026 12:00:00 +0000
Content-Type: text/plain; charset="utf-8"

Your banking account has been temporarily restricted due to suspicious activity.
Verify immediately at http://secure-bank-login.com
"""
    parsed = parse_raw_mime_string(raw_eml)
    assert parsed.subject == "Urgent: Account Suspended"
    assert "security@bank.com" in parsed.sender
    assert "Your banking account has been temporarily restricted" in parsed.plain_body
    assert parsed.has_attachments is False
