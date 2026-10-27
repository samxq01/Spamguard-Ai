"""Gmail Scanner orchestrator connecting Gmail API data with the frozen SpamPredictor.

Preserves exact relationships between retrieved emails and inference results,
applies configurable review thresholds for borderline decisions,
and produces explainability telemetry without mutating user messages.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.gmail.client import GmailClient
from src.gmail.parser import ParsedEmailContent, parse_gmail_message_payload
from src.predict import FeatureContribution, PredictionResult, get_default_predictor

logger = logging.getLogger("SpamGuardAI.GmailScanner")

# Conservative review thresholds (borderline predictions marked for manual inspection)
DEFAULT_REVIEW_THRESHOLD_LOW = 0.35
DEFAULT_REVIEW_THRESHOLD_HIGH = 0.65

LEXICAL_SAFETY_ADVISORY = (
    "Lexical classification evaluates statistical vocabulary patterns. "
    "A Ham classification does not guarantee safety from novel spear-phishing or malicious payloads. "
    "Verify sender authenticity and external links independently."
)


@dataclass
class ScannedEmailResult:
    """Complete scan result for an individual Gmail message."""

    id: str
    thread_id: str
    sender: str
    recipient: str
    subject: str
    date: str
    snippet: str
    body_preview: str
    predicted_class: int
    predicted_label: str
    is_spam: bool
    spam_probability: float
    ham_probability: float
    review_status: str  # "Spam", "Ham", or "Needs Review"
    confidence_level: str  # "High Confidence", "Moderate", "Borderline"
    needs_review: bool
    processing_time_ms: float
    top_features: List[Dict[str, Any]]
    warning_advisory: str
    has_html: bool
    has_attachments: bool


# Alias for backward compatibility
GmailScanResult = ScannedEmailResult


@dataclass
class GmailScanSummary:
    """Aggregated scan summary for the operational dashboard and inbox view."""

    total_scanned: int
    spam_count: int
    ham_count: int
    review_count: int
    spam_percentage: float
    ham_percentage: float
    review_percentage: float
    scan_timestamp: str
    duration_ms: float
    items: List[ScannedEmailResult]


class GmailScanner:
    """Coordinates batch Gmail retrieval and ML inference using the frozen SpamPredictor."""

    def __init__(
        self,
        client: GmailClient,
        review_threshold_low: float = DEFAULT_REVIEW_THRESHOLD_LOW,
        review_threshold_high: float = DEFAULT_REVIEW_THRESHOLD_HIGH,
    ) -> None:
        self.client = client
        self.threshold_low = review_threshold_low
        self.threshold_high = review_threshold_high
        self.predictor = get_default_predictor()

    def _determine_review_status(self, spam_prob: float) -> tuple[str, str, bool]:
        """Categorizes prediction into conservative decision boundaries.

        Returns:
            (review_status, confidence_level, needs_review)
        """
        if spam_prob >= self.threshold_high:
            conf = "High Confidence" if spam_prob >= 0.85 else "Moderate"
            return ("Spam", conf, False)
        elif spam_prob <= self.threshold_low:
            conf = "High Confidence" if spam_prob <= 0.15 else "Moderate"
            return ("Ham", conf, False)
        else:
            return ("Needs Review", "Borderline", True)

    def scan_message_resource(
        self,
        raw_msg: Dict[str, Any],
        explain: bool = True,
        top_k: int = 5,
    ) -> ScannedEmailResult:
        """Parses and classifies a single Gmail API message dictionary."""
        msg_id = raw_msg.get("id", "unknown")
        thread_id = raw_msg.get("threadId", "")

        t0 = time.perf_counter()
        parsed: ParsedEmailContent = parse_gmail_message_payload(raw_msg)

        # Pass through frozen predictor
        res: PredictionResult = self.predictor.predict_email(
            subject=parsed.subject,
            body=parsed.plain_body,
            explain=explain,
            top_k=top_k,
        )
        proc_time = (time.perf_counter() - t0) * 1000.0

        status, confidence, needs_rev = self._determine_review_status(res.spam_probability)

        features = [
            {
                "token": f.token,
                "weight": round(f.weight, 4),
                "log_odds_diff": round(f.log_odds_diff, 4),
                "contribution": round(f.contribution, 4),
                "association": f.association,
            }
            for f in res.top_features
        ]

        # Body preview for safe rendering
        body_prev = parsed.plain_body[:180].strip()
        if len(parsed.plain_body) > 180:
            body_prev += "..."

        return ScannedEmailResult(
            id=msg_id,
            thread_id=thread_id,
            sender=parsed.sender,
            recipient=parsed.recipient,
            subject=parsed.subject,
            date=parsed.date,
            snippet=parsed.snippet,
            body_preview=body_prev,
            predicted_class=res.predicted_class,
            predicted_label=res.predicted_label,
            is_spam=res.is_spam,
            spam_probability=round(res.spam_probability, 4),
            ham_probability=round(res.ham_probability, 4),
            review_status=status,
            confidence_level=confidence,
            needs_review=needs_rev,
            processing_time_ms=round(proc_time, 2),
            top_features=features,
            warning_advisory=LEXICAL_SAFETY_ADVISORY,
            has_html=parsed.has_html,
            has_attachments=parsed.has_attachments,
        )

    def scan_recent_messages(
        self,
        max_messages: int = 20,
        query: str = "",
        explain: bool = True,
        top_k: int = 5,
    ) -> GmailScanSummary:
        """Retrieves and classifies the most recent mailbox messages."""
        t_start = time.perf_counter()

        list_resp = self.client.list_messages(query=query, max_results=max_messages)
        message_refs = list_resp.get("messages", [])

        results: List[ScannedEmailResult] = []
        for ref in message_refs:
            mid = ref.get("id")
            if not mid:
                continue
            try:
                raw_msg = self.client.get_message(mid)
                result = self.scan_message_resource(raw_msg, explain=explain, top_k=top_k)
                results.append(result)
            except Exception as exc:
                logger.warning("Skipping message %s due to retrieval or inference error: %s", mid, exc)
                continue

        total_duration = (time.perf_counter() - t_start) * 1000.0

        return self._build_summary(results, total_duration)

    def scan_selected_messages(
        self,
        message_ids: List[str],
        explain: bool = True,
        top_k: int = 5,
    ) -> GmailScanSummary:
        """Retrieves and classifies an explicit list of user-selected message IDs."""
        t_start = time.perf_counter()

        results: List[ScannedEmailResult] = []
        for mid in message_ids[:50]:
            try:
                raw_msg = self.client.get_message(mid)
                result = self.scan_message_resource(raw_msg, explain=explain, top_k=top_k)
                results.append(result)
            except Exception as exc:
                logger.warning("Error scanning selected message %s: %s", mid, exc)
                continue

        total_duration = (time.perf_counter() - t_start) * 1000.0
        return self._build_summary(results, total_duration)

    def _build_summary(self, results: List[ScannedEmailResult], duration_ms: float) -> GmailScanSummary:
        total = len(results)
        spam_count = sum(1 for r in results if r.review_status == "Spam")
        ham_count = sum(1 for r in results if r.review_status == "Ham")
        review_count = sum(1 for r in results if r.review_status == "Needs Review")

        spam_pct = round((spam_count / total) * 100.0, 2) if total else 0.0
        ham_pct = round((ham_count / total) * 100.0, 2) if total else 0.0
        review_pct = round((review_count / total) * 100.0, 2) if total else 0.0

        now_iso = datetime.now(timezone.utc).isoformat()

        return GmailScanSummary(
            total_scanned=total,
            spam_count=spam_count,
            ham_count=ham_count,
            review_count=review_count,
            spam_percentage=spam_pct,
            ham_percentage=ham_pct,
            review_percentage=review_pct,
            scan_timestamp=now_iso,
            duration_ms=round(duration_ms, 2),
            items=results,
        )
