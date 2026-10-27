"""Unit and integration tests for Gmail scanner orchestration, review thresholds, and mock responses."""

from __future__ import annotations

import base64
import time
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from src.api import app
from src.gmail.auth import SESSION_COOKIE_NAME, get_auth_manager
from src.gmail.client import (
    GmailApiError,
    GmailAuthError,
    GmailClient,
    GmailPermissionError,
    GmailRateLimitError,
)
from src.gmail.scanner import (
    DEFAULT_REVIEW_THRESHOLD_HIGH,
    DEFAULT_REVIEW_THRESHOLD_LOW,
    GmailScanner,
    ScannedEmailResult,
)

client = TestClient(app)


def _create_mock_gmail_message(
    msg_id: str,
    subject: str,
    body_text: str,
    sender: str = "sender@example.com",
    date: str = "Tue, 27 Oct 2026 12:00:00 +0000",
) -> dict:
    b64_data = base64.urlsafe_b64encode(body_text.encode("utf-8")).decode("ascii")
    return {
        "id": msg_id,
        "threadId": f"thread_{msg_id}",
        "snippet": body_text[:100],
        "payload": {
            "mimeType": "text/plain",
            "headers": [
                {"name": "Subject", "value": subject},
                {"name": "From", "value": sender},
                {"name": "Date", "value": date},
            ],
            "body": {"data": b64_data},
        },
    }


def test_unauthenticated_gmail_endpoints_return_401():
    """Verify private Gmail endpoints reject requests without a valid session."""
    # List messages
    r1 = client.get("/api/gmail/messages")
    assert r1.status_code == 401
    assert "Authentication required" in r1.json()["detail"]

    # Scan recent
    r2 = client.post("/api/gmail/scan", json={"max_messages": 10})
    assert r2.status_code == 401

    # Scan selected
    r3 = client.post("/api/gmail/scan-selected", json={"message_ids": ["msg-1"]})
    assert r3.status_code == 401


def test_scanner_with_mocked_client_spam_and_ham():
    """Verify GmailScanner correctly classifies retrieved messages and associates metadata."""
    mock_client = MagicMock(spec=GmailClient)

    # Prepare two test emails: 1 clear spam, 1 clear ham
    spam_msg = _create_mock_gmail_message(
        msg_id="spam_001",
        subject="Claim Your Free Guaranteed Bonus Cash",
        body_text="Congratulations! You have won $50,000 cash prize bonus payout. Click http://claim.com now to deposit free money.",
        sender="rewards@prize-promo.com",
    )
    ham_msg = _create_mock_gmail_message(
        msg_id="ham_002",
        subject="Engineering Architecture Review Meeting",
        body_text="Hi team, please find attached the diagram and agenda for tomorrow's sprint review.",
        sender="tech-lead@company.org",
    )

    mock_client.list_messages.return_value = {
        "messages": [{"id": "spam_001"}, {"id": "ham_002"}],
        "resultSizeEstimate": 2,
    }
    mock_client.get_message.side_effect = lambda mid: spam_msg if mid == "spam_001" else ham_msg

    scanner = GmailScanner(
        client=mock_client,
        review_threshold_low=0.35,
        review_threshold_high=0.65,
    )

    summary = scanner.scan_recent_messages(max_messages=2)

    assert summary.total_scanned == 2
    assert summary.spam_count == 1
    assert summary.ham_count == 1
    assert summary.review_count == 0

    item_spam = next(it for it in summary.items if it.id == "spam_001")
    assert item_spam.is_spam is True
    assert item_spam.review_status == "Spam"
    assert item_spam.spam_probability > 0.70
    assert "rewards@prize-promo.com" in item_spam.sender
    assert len(item_spam.top_features) > 0

    item_ham = next(it for it in summary.items if it.id == "ham_002")
    assert item_ham.is_spam is False
    assert item_ham.review_status == "Ham"
    assert item_ham.ham_probability > 0.80
    assert "tech-lead@company.org" in item_ham.sender


def test_scanner_borderline_review_threshold():
    """Verify borderline predictions between low and high thresholds are marked Needs Review."""
    mock_client = MagicMock(spec=GmailClient)
    scanner = GmailScanner(
        client=mock_client,
        review_threshold_low=0.40,
        review_threshold_high=0.60,
    )

    # Directly test threshold logic
    s_spam, conf_s, nr_s = scanner._determine_review_status(0.85)
    assert s_spam == "Spam"
    assert conf_s == "High Confidence"
    assert nr_s is False

    s_ham, conf_h, nr_h = scanner._determine_review_status(0.10)
    assert s_ham == "Ham"
    assert conf_h == "High Confidence"
    assert nr_h is False

    s_borderline, conf_b, nr_b = scanner._determine_review_status(0.52)
    assert s_borderline == "Needs Review"
    assert conf_b == "Borderline"
    assert nr_b is True


def test_gmail_client_read_only_invariants():
    """Verify that GmailClient class contains zero mutating methods."""
    client_obj = GmailClient(access_token="fake_token")
    client_methods = [m for m in dir(client_obj) if not m.startswith("_")]

    # Forbidden method names
    forbidden_prefixes = ["send", "delete", "trash", "modify", "update", "create", "insert", "draft"]
    for m in client_methods:
        for prefix in forbidden_prefixes:
            assert not m.lower().startswith(prefix), f"Disallowed mutating method found in GmailClient: {m}"


def test_settings_api_get_and_post():
    """Verify /api/settings returns and updates runtime review thresholds."""
    # GET settings
    r_get = client.get("/api/settings")
    assert r_get.status_code == 200
    data_get = r_get.json()
    assert "threshold_low" in data_get
    assert "threshold_high" in data_get

    # Valid POST settings update
    r_post = client.post(
        "/api/settings",
        json={"threshold_low": 0.30, "threshold_high": 0.70},
    )
    assert r_post.status_code == 200
    data_post = r_post.json()
    assert data_post["threshold_low"] == 0.30
    assert data_post["threshold_high"] == 0.70

    # Invalid POST: threshold_low >= threshold_high or out of bounds triggers validation error
    r_bad = client.post(
        "/api/settings",
        json={"threshold_low": 0.80, "threshold_high": 0.50},
    )
    assert r_bad.status_code in (400, 422)


def test_authenticated_scan_with_valid_session():
    """Verify authenticated /api/gmail/scan works with a valid signed session cookie."""
    auth_mgr = get_auth_manager()
    session_payload = {
        "access_token": "ya29.mock_valid_token",
        "email": "testuser@gmail.com",
        "name": "Test User",
        "expires_at": time.time() + 3600,
        "scopes": ["https://www.googleapis.com/auth/gmail.readonly"],
    }
    session_cookie = auth_mgr.create_session_token(session_payload)

    mock_msg = _create_mock_gmail_message(
        msg_id="msg_test_01",
        subject="Quarterly Budget Report",
        body_text="Hi all, here is the approved quarterly operating budget.",
    )

    with patch("src.api.GmailClient.list_messages") as mock_list, \
         patch("src.api.GmailClient.get_message") as mock_get:
        mock_list.return_value = {"messages": [{"id": "msg_test_01"}]}
        mock_get.return_value = mock_msg

        client.cookies.set(SESSION_COOKIE_NAME, session_cookie)
        resp = client.post("/api/gmail/scan", json={"max_messages": 1})
        client.cookies.clear()

        assert resp.status_code == 200
        scan_data = resp.json()
        assert scan_data["total_scanned"] == 1
        assert len(scan_data["items"]) == 1
        assert scan_data["items"][0]["id"] == "msg_test_01"
        assert scan_data["items"][0]["review_status"] == "Ham"
