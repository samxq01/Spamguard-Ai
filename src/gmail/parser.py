"""Safe MIME and Gmail API email parser with defense-in-depth HTML sanitization.

Extracts readable plain text, decodes RFC 2047 headers, strips active content,
and enforces input bounds to protect down-stream ML inference and user interfaces.
"""

from __future__ import annotations

import base64
import email
from email.header import decode_header, make_header
import html
import re
from dataclasses import dataclass, field
from typing import Any, List, Optional

# Safety bounds
MAX_PARSED_CHARS = 1_000_000
MAX_MIME_RECURSION_DEPTH = 12

# Regex patterns for HTML active content removal
RE_SCRIPT = re.compile(r"<\s*script[^>]*>[\s\S]*?<\s*/\s*script\s*>", re.IGNORECASE)
RE_STYLE = re.compile(r"<\s*style[^>]*>[\s\S]*?<\s*/\s*style\s*>", re.IGNORECASE)
RE_NOSCRIPT = re.compile(r"<\s*noscript[^>]*>[\s\S]*?<\s*/\s*noscript\s*>", re.IGNORECASE)
RE_COMMENTS = re.compile(r"<!--[\s\S]*?-->")
RE_BREAKS = re.compile(r"<\s*(?:br|p|div|tr|li|h[1-6])[^>]*>", re.IGNORECASE)
RE_TAGS = re.compile(r"<[^>]+>")
RE_WHITESPACE = re.compile(r"[ \t]+")
RE_NEWLINES = re.compile(r"\n{3,}")


def decode_mime_header_value(raw_val: Optional[str]) -> str:
    """Safely decodes an RFC 2047 MIME encoded-word header (e.g. =?UTF-8?B?...?=)."""
    if not raw_val:
        return ""
    try:
        decoded_header = decode_header(raw_val)
        return str(make_header(decoded_header)).strip()
    except Exception:
        # Fallback to string representation if header decoding fails
        return str(raw_val).strip()


def strip_html_to_plain_text(html_text: str) -> str:
    """Sanitizes HTML content into safe plain text.

    Removes script tags, styles, embedded objects, and HTML tags,
    converts block elements into newlines, and decodes HTML entities.
    """
    if not html_text:
        return ""

    # Truncate defensively before heavy regex if overly large
    if len(html_text) > MAX_PARSED_CHARS * 2:
        html_text = html_text[: MAX_PARSED_CHARS * 2]

    # 1. Strip script, style, noscript, comments
    text = RE_SCRIPT.sub(" ", html_text)
    text = RE_STYLE.sub(" ", text)
    text = RE_NOSCRIPT.sub(" ", text)
    text = RE_COMMENTS.sub(" ", text)

    # 2. Convert breaks/paragraphs/divisions to newlines
    text = RE_BREAKS.sub("\n", text)

    # 3. Strip all remaining HTML tags
    text = RE_TAGS.sub(" ", text)

    # 4. Decode HTML entities (&amp;, &nbsp;, &lt;, etc.)
    text = html.unescape(text)

    # 5. Normalize whitespace
    text = RE_WHITESPACE.sub(" ", text)
    lines = [line.strip() for line in text.splitlines()]
    text = "\n".join(line for line in lines if line)
    text = RE_NEWLINES.sub("\n\n", text)

    return text[:MAX_PARSED_CHARS].strip()


@dataclass
class ParsedEmailContent:
    """Standardized representation of a parsed email for classification and presentation."""

    subject: str = ""
    sender: str = ""
    recipient: str = ""
    date: str = ""
    plain_body: str = ""
    snippet: str = ""
    has_html: bool = False
    has_attachments: bool = False
    raw_char_count: int = 0


def _safe_b64url_decode(encoded_str: str) -> str:
    """Decodes standard base64 or URL-safe base64 data to UTF-8 text."""
    if not encoded_str:
        return ""
    try:
        # Pad string to multiple of 4
        padded = encoded_str + "=" * ((4 - len(encoded_str) % 4) % 4)
        raw_bytes = base64.urlsafe_b64decode(padded.encode("ascii"))
        return raw_bytes.decode("utf-8", errors="replace")
    except Exception:
        try:
            raw_bytes = base64.b64decode(encoded_str.encode("ascii"))
            return raw_bytes.decode("utf-8", errors="replace")
        except Exception:
            return ""


def parse_gmail_message_payload(msg: dict[str, Any]) -> ParsedEmailContent:
    """Extracts headers, snippet, and plain text content from a Gmail API message resource.

    Expects the JSON structure returned by:
    `GET https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}?format=full`
    """
    snippet = msg.get("snippet", "")
    payload = msg.get("payload", {})
    headers_list = payload.get("headers", [])

    headers: dict[str, str] = {}
    for h in headers_list:
        name = h.get("name", "").lower()
        val = h.get("value", "")
        if name and val:
            headers[name] = val

    subject = decode_mime_header_value(headers.get("subject", ""))
    sender = decode_mime_header_value(headers.get("from", ""))
    recipient = decode_mime_header_value(headers.get("to", ""))
    date = decode_mime_header_value(headers.get("date", ""))

    plain_parts: List[str] = []
    html_parts: List[str] = []
    has_attachments = False

    def traverse_parts(part_node: dict[str, Any], depth: int = 0) -> None:
        nonlocal has_attachments
        if depth > MAX_MIME_RECURSION_DEPTH:
            return

        mime_type = part_node.get("mimeType", "").lower()
        filename = part_node.get("filename", "")
        if filename:
            has_attachments = True

        body = part_node.get("body", {})
        data = body.get("data", "")

        if data:
            decoded = _safe_b64url_decode(data)
            if mime_type == "text/plain":
                plain_parts.append(decoded)
            elif mime_type == "text/html":
                html_parts.append(decoded)

        sub_parts = part_node.get("parts", [])
        for sub in sub_parts:
            traverse_parts(sub, depth + 1)

    # Check top-level payload body or sub-parts
    top_mime = payload.get("mimeType", "").lower()
    top_body_data = payload.get("body", {}).get("data", "")
    if top_body_data:
        decoded = _safe_b64url_decode(top_body_data)
        if top_mime == "text/plain":
            plain_parts.append(decoded)
        elif top_mime == "text/html":
            html_parts.append(decoded)

    for p in payload.get("parts", []):
        traverse_parts(p, depth=1)

    # Select best readable representation
    has_html = len(html_parts) > 0
    if plain_parts:
        body_text = "\n\n".join(plain_parts)
    elif html_parts:
        body_text = strip_html_to_plain_text("\n\n".join(html_parts))
    else:
        # Fallback to snippet if body payload was empty
        body_text = snippet

    body_text = body_text[:MAX_PARSED_CHARS].strip()

    return ParsedEmailContent(
        subject=subject or "(No Subject)",
        sender=sender or "Unknown Sender",
        recipient=recipient,
        date=date,
        plain_body=body_text,
        snippet=snippet,
        has_html=has_html,
        has_attachments=has_attachments,
        raw_char_count=len(body_text),
    )


def parse_raw_mime_string(raw_mime: str | bytes) -> ParsedEmailContent:
    """Parses standard RFC 822 / RFC 2822 raw MIME email message (such as from .eml or SpamAssassin)."""
    if isinstance(raw_mime, str):
        msg = email.message_from_string(raw_mime)
    else:
        msg = email.message_from_bytes(raw_mime)

    subject = decode_mime_header_value(msg.get("subject", ""))
    sender = decode_mime_header_value(msg.get("from", ""))
    recipient = decode_mime_header_value(msg.get("to", ""))
    date = decode_mime_header_value(msg.get("date", ""))

    plain_parts: List[str] = []
    html_parts: List[str] = []
    has_attachments = False

    if msg.is_multipart():
        for part in msg.walk():
            # Check attachment
            disposition = str(part.get("Content-Disposition", "")).lower()
            if "attachment" in disposition or part.get_filename():
                has_attachments = True
                continue

            content_type = part.get_content_type().lower()
            try:
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    text = payload.decode(charset, errors="replace")
                    if content_type == "text/plain":
                        plain_parts.append(text)
                    elif content_type == "text/html":
                        html_parts.append(text)
            except Exception:
                continue
    else:
        content_type = msg.get_content_type().lower()
        try:
            payload = msg.get_payload(decode=True)
            if payload:
                charset = msg.get_content_charset() or "utf-8"
                text = payload.decode(charset, errors="replace")
                if content_type == "text/plain":
                    plain_parts.append(text)
                elif content_type == "text/html":
                    html_parts.append(text)
        except Exception:
            text = str(msg.get_payload() or "")
            plain_parts.append(text)

    has_html = len(html_parts) > 0
    if plain_parts:
        body_text = "\n\n".join(plain_parts)
    elif html_parts:
        body_text = strip_html_to_plain_text("\n\n".join(html_parts))
    else:
        body_text = ""

    body_text = body_text[:MAX_PARSED_CHARS].strip()

    return ParsedEmailContent(
        subject=subject or "(No Subject)",
        sender=sender or "Unknown Sender",
        recipient=recipient,
        date=date,
        plain_body=body_text,
        snippet=body_text[:120].strip(),
        has_html=has_html,
        has_attachments=has_attachments,
        raw_char_count=len(body_text),
    )
