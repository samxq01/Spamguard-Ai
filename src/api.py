"""SpamGuard AI — Thin High-Performance FastAPI Inference Service.

Exposes RESTful prediction, batch classification, and verified model telemetry
using the frozen, SHA-256 authenticated SpamPredictor engine.
"""

from __future__ import annotations

import io
import json
import logging
import platform
import sys
import time
from pathlib import Path
from typing import Any, List, Optional

import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from dotenv import load_dotenv

# Ensure root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Load .env file automatically from project root
load_dotenv(PROJECT_ROOT / ".env", override=True)

from src.config import (
    DEFAULT_TOP_K_EXPLANATIONS,
    EXPECTED_PIPELINE_SHA256,
    MAX_BATCH_SIZE,
    MAX_INPUT_CHARS,
    SAVED_PIPELINE_PATH,
    TEST_EVALUATION_FILE,
)
from src.predict import (
    FeatureContribution,
    PredictionResult,
    SpamGuardBatchError,
    SpamGuardModelError,
    SpamGuardValidationError,
    compute_file_sha256,
    get_default_predictor,
    sanitize_csv_cell,
)
from src.ui_helpers import SAMPLE_EMAILS
from src.gmail import (
    GMAIL_SCOPES,
    SESSION_COOKIE_NAME,
    GmailApiError,
    GmailAuthError,
    GmailAuthManager,
    GmailClient,
    GmailPermissionError,
    GmailRateLimitError,
    GmailScanner,
    GmailScanSummary,
    ScannedEmailResult,
    get_auth_manager,
    parse_gmail_message_payload,
)

logger = logging.getLogger("SpamGuardAI.API")

# Runtime configurable settings
_RUNTIME_SETTINGS = {
    "threshold_low": 0.35,
    "threshold_high": 0.65,
    "updated_at": "default",
}

# =====================================================================
# Pydantic Schemas
# =====================================================================

class GmailAuthStatusResponse(BaseModel):
    authenticated: bool
    configured: bool
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    connected_at: Optional[float] = None
    scopes: List[str] = Field(default_factory=list)
    setup_instructions: Optional[dict[str, Any]] = None


class GmailStartResponse(BaseModel):
    authorization_url: str
    state: str


class GmailMessageItem(BaseModel):
    id: str
    thread_id: str
    sender: str
    recipient: str
    subject: str
    date: str
    snippet: str
    body_preview: str
    has_html: bool
    has_attachments: bool


class GmailListResponse(BaseModel):
    total_found: int
    next_page_token: Optional[str] = None
    messages: List[GmailMessageItem]


class GmailScanRequest(BaseModel):
    max_messages: int = Field(default=15, ge=1, le=50)
    query: str = Field(default="", max_length=200)
    explain: bool = Field(default=True)
    top_k: int = Field(default=5, ge=1, le=20)


class GmailScanSelectedRequest(BaseModel):
    message_ids: List[str] = Field(..., min_length=1, max_length=50)
    explain: bool = Field(default=True)
    top_k: int = Field(default=5, ge=1, le=20)


class ScannedEmailModel(BaseModel):
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
    review_status: str
    confidence_level: str
    needs_review: bool
    processing_time_ms: float
    top_features: List[FeatureContributionModel]
    warning_advisory: str
    has_html: bool
    has_attachments: bool


class GmailScanResponse(BaseModel):
    total_scanned: int
    spam_count: int
    ham_count: int
    review_count: int
    spam_percentage: float
    ham_percentage: float
    review_percentage: float
    scan_timestamp: str
    duration_ms: float
    items: List[ScannedEmailModel]


class SettingsModel(BaseModel):
    threshold_low: float = Field(default=0.35, ge=0.05, le=0.49)
    threshold_high: float = Field(default=0.65, ge=0.51, le=0.95)


class SettingsResponse(BaseModel):
    threshold_low: float
    threshold_high: float
    updated_at: str

class FeatureContributionModel(BaseModel):
    token: str
    weight: float
    log_odds_diff: float
    contribution: float
    association: str


class PredictRequest(BaseModel):
    subject: str = Field(default="", max_length=100000)
    body: str = Field(default="", max_length=MAX_INPUT_CHARS)
    explain: bool = Field(default=True)
    top_k: int = Field(default=DEFAULT_TOP_K_EXPLANATIONS, ge=1, le=50)


class PredictResponse(BaseModel):
    predicted_class: int
    predicted_label: str
    is_spam: bool
    spam_probability: float
    ham_probability: float
    processing_time_ms: float
    cleaned_char_count: int
    model_identifier: str
    top_features: List[FeatureContributionModel]


class BatchEmailItem(BaseModel):
    id: Optional[str] = None
    subject: str = Field(default="", max_length=100000)
    body: str = Field(default="", max_length=MAX_INPUT_CHARS)


class BatchPredictRequest(BaseModel):
    emails: List[BatchEmailItem]
    explain: bool = Field(default=False)
    top_k: int = Field(default=5, ge=1, le=20)


class BatchItemResult(BaseModel):
    id: Optional[str] = None
    subject: str
    body_preview: str
    predicted_class: int
    predicted_label: str
    is_spam: bool
    spam_probability: float
    ham_probability: float
    processing_time_ms: float
    top_features: List[FeatureContributionModel] = Field(default_factory=list)


class BatchPredictResponse(BaseModel):
    total_count: int
    spam_count: int
    ham_count: int
    spam_percentage: float
    ham_percentage: float
    total_duration_ms: float
    avg_latency_ms: float
    items: List[BatchItemResult]


class HealthResponse(BaseModel):
    status: str
    model_available: bool
    model_sha256: str
    model_sha256_verified: bool
    model_identifier: str
    system_info: dict[str, str]


# =====================================================================
# FastAPI Application Factory
# =====================================================================

app = FastAPI(
    title="SpamGuard AI — Inference Engine",
    version="1.0.0",
    description="Thin, secure RESTful API powering the Anthracite-inspired SpamGuard AI experience.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS Middleware (supports Next.js dev server on 3000, Vite on 5173, and Streamlit on 8501)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8501",
        "http://127.0.0.1:8501",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# =====================================================================
# Routes
# =====================================================================

@app.get("/api/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Verifies service readiness and cryptographic model integrity."""
    model_available = SAVED_PIPELINE_PATH.exists()
    actual_sha = ""
    is_verified = False
    model_identifier = "Unavailable"

    if model_available:
        try:
            actual_sha = compute_file_sha256(SAVED_PIPELINE_PATH)
            is_verified = (actual_sha.lower() == EXPECTED_PIPELINE_SHA256.lower())
            predictor = get_default_predictor()
            model_identifier = predictor._model_identifier
        except Exception as exc:
            logger.error("Health check model inspection error: %s", exc)
            return HealthResponse(
                status="DEGRADED",
                model_available=model_available,
                model_sha256=actual_sha,
                model_sha256_verified=False,
                model_identifier=f"Error: {exc}",
                system_info={
                    "os": platform.platform(),
                    "python": platform.python_version(),
                },
            )

    return HealthResponse(
        status="OPERATIONAL" if (model_available and is_verified) else "UNAVAILABLE",
        model_available=model_available,
        model_sha256=actual_sha,
        model_sha256_verified=is_verified,
        model_identifier=model_identifier,
        system_info={
            "os": platform.platform(),
            "python": platform.python_version(),
        },
    )


@app.post("/api/predict", response_model=PredictResponse)
def predict_single(payload: PredictRequest) -> PredictResponse:
    """Classifies a single email and returns probability and explainability telemetry."""
    try:
        predictor = get_default_predictor()
    except SpamGuardModelError as me:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model engine unavailable: {me}",
        )

    try:
        res: PredictionResult = predictor.predict_email(
            subject=payload.subject,
            body=payload.body,
            explain=payload.explain,
            top_k=payload.top_k,
        )
    except SpamGuardValidationError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as exc:
        logger.error("Single email inference exception: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Inference failed unexpectedly.",
        )

    return PredictResponse(
        predicted_class=res.predicted_class,
        predicted_label=res.predicted_label,
        is_spam=res.is_spam,
        spam_probability=round(res.spam_probability, 4),
        ham_probability=round(res.ham_probability, 4),
        processing_time_ms=round(res.processing_time_ms, 2),
        cleaned_char_count=res.cleaned_char_count,
        model_identifier=res.model_identifier,
        top_features=[
            FeatureContributionModel(
                token=f.token,
                weight=round(f.weight, 4),
                log_odds_diff=round(f.log_odds_diff, 4),
                contribution=round(f.contribution, 4),
                association=f.association,
            )
            for f in res.top_features
        ],
    )


@app.post("/api/predict/batch", response_model=BatchPredictResponse)
def predict_batch_json(payload: BatchPredictRequest) -> BatchPredictResponse:
    """Performs high-throughput vectorized classification on a list of email objects."""
    if not payload.emails:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch list cannot be empty.",
        )
    if len(payload.emails) > MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch size {len(payload.emails):,} exceeds maximum limit of {MAX_BATCH_SIZE:,}.",
        )

    try:
        predictor = get_default_predictor()
    except SpamGuardModelError as me:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model engine unavailable: {me}",
        )

    items_to_predict = [(e.subject, e.body) for e in payload.emails]

    t0 = time.perf_counter()
    try:
        raw_results: list[PredictionResult] = predictor.predict_batch(
            emails=items_to_predict,
            explain=payload.explain,
            top_k=payload.top_k,
        )
    except (SpamGuardValidationError, SpamGuardBatchError) as be:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(be),
        )
    except Exception as exc:
        logger.error("Vectorized batch classification error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch classification failed: {exc}",
        )

    total_duration_ms = (time.perf_counter() - t0) * 1000.0

    items_response: list[BatchItemResult] = []
    spam_count = 0
    for idx, (res, orig) in enumerate(zip(raw_results, payload.emails)):
        if res.is_spam:
            spam_count += 1
        body_prev = orig.body[:120].strip()
        if len(orig.body) > 120:
            body_prev += "..."
        items_response.append(
            BatchItemResult(
                id=orig.id or str(idx + 1),
                subject=sanitize_csv_cell(orig.subject) if orig.subject else "(No Subject)",
                body_preview=body_prev,
                predicted_class=res.predicted_class,
                predicted_label=res.predicted_label,
                is_spam=res.is_spam,
                spam_probability=round(res.spam_probability, 4),
                ham_probability=round(res.ham_probability, 4),
                processing_time_ms=round(res.processing_time_ms, 2),
                top_features=[
                    FeatureContributionModel(
                        token=f.token,
                        weight=round(f.weight, 4),
                        log_odds_diff=round(f.log_odds_diff, 4),
                        contribution=round(f.contribution, 4),
                        association=f.association,
                    )
                    for f in res.top_features
                ],
            )
        )

    total_count = len(items_response)
    ham_count = total_count - spam_count
    spam_pct = round((spam_count / total_count) * 100.0, 2) if total_count else 0.0
    ham_pct = round((ham_count / total_count) * 100.0, 2) if total_count else 0.0

    return BatchPredictResponse(
        total_count=total_count,
        spam_count=spam_count,
        ham_count=ham_count,
        spam_percentage=spam_pct,
        ham_percentage=ham_pct,
        total_duration_ms=round(total_duration_ms, 2),
        avg_latency_ms=round(total_duration_ms / total_count, 3) if total_count else 0.0,
        items=items_response,
    )


@app.post("/api/predict/csv", response_model=BatchPredictResponse)
async def predict_batch_csv(
    file: UploadFile = File(...),
    explain: bool = Query(default=False),
) -> BatchPredictResponse:
    """Parses an uploaded CSV file, executes batch inference, and applies formula injection defenses."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a valid .csv file.",
        )

    try:
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:  # 50MB bound
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV file exceeds 50MB size limit.",
            )
        df = pd.read_csv(io.BytesIO(content), dtype=str, keep_default_na=False)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse CSV file: {exc}",
        )

    # Normalize column names
    col_map = {c.strip().lower(): c for c in df.columns}
    has_body = "body" in col_map or "text" in col_map
    has_subject = "subject" in col_map

    if not has_body and not has_subject:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV must contain at least a 'body' (or 'text') or 'subject' column.",
        )

    body_col = col_map.get("body", col_map.get("text", ""))
    subj_col = col_map.get("subject", "")

    batch_items: list[BatchEmailItem] = []
    for idx, row in df.iterrows():
        b_val = str(row[body_col]) if body_col else ""
        s_val = str(row[subj_col]) if subj_col else ""
        batch_items.append(
            BatchEmailItem(
                id=str(idx + 1),
                subject=s_val,
                body=b_val,
            )
        )

    return predict_batch_json(
        BatchPredictRequest(emails=batch_items, explain=explain)
    )


@app.get("/api/metrics")
def get_evaluation_metrics() -> dict[str, Any]:
    """Returns verified academic test metrics and metadata from reports/test_evaluation.json."""
    if not TEST_EVALUATION_FILE.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test evaluation report not found on disk.",
        )

    try:
        with open(TEST_EVALUATION_FILE, "r", encoding="utf-8") as f:
            eval_data = json.load(f)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read evaluation report: {exc}",
        )

    # Load training and split summaries if present
    train_summary_file = PROJECT_ROOT / "reports" / "training_summary.json"
    split_summary_file = PROJECT_ROOT / "reports" / "split_summary.json"
    perf_file = PROJECT_ROOT / "reports" / "performance_benchmark.json"

    train_data = {}
    if train_summary_file.exists():
        try:
            with open(train_summary_file, "r", encoding="utf-8") as f:
                train_data = json.load(f)
        except Exception:
            pass

    split_data = {}
    if split_summary_file.exists():
        try:
            with open(split_summary_file, "r", encoding="utf-8") as f:
                split_data = json.load(f)
        except Exception:
            pass

    perf_data = {}
    if perf_file.exists():
        try:
            with open(perf_file, "r", encoding="utf-8") as f:
                perf_data = json.load(f)
        except Exception:
            pass

    return {
        "evaluation": eval_data,
        "training": train_data,
        "splits": split_data,
        "benchmarks": perf_data,
        "course_metadata": {
            "title": "SpamGuard AI — AI-Based Spam Email Classifier",
            "course": "Semester 3 AI Micro Project – 05",
            "competencies": [
                {
                    "code": "CO2",
                    "title": "Algorithm Selection",
                    "description": "Multinomial Naïve Bayes probabilistic model tailored for discrete TF-IDF text features.",
                },
                {
                    "code": "CO4",
                    "title": "Model Engineering",
                    "description": "Leak-free Scikit-learn Pipeline with unigram/bigram TF-IDF vectorization and Lidstone smoothing (alpha=0.1).",
                },
                {
                    "code": "CO5",
                    "title": "Evaluation Metrics",
                    "description": "Multi-metric statistical evaluation on held-out test split (n=889) verifying Precision, Recall, F1, and ROC-AUC.",
                },
            ],
            "team_roles": [
                {
                    "name": "Samuvel Raj R",
                    "role": "Systems Architect & Defensive Engineering",
                    "responsibility": "Phase 06-10: Inference engine, FastAPI integration, Streamlit hardening, security audits",
                },
                {
                    "name": "Azriel Gershom Raj",
                    "role": "Machine Learning & Pipeline Engineer",
                    "responsibility": "Phase 01-05: Ingestion pipeline, EDA, leakage-safe text preprocessing, Naïve Bayes model tuning",
                },
                {
                    "name": "CO4 Model Engineering Specialist",
                    "role": "Data Verification & Feature Engineering",
                    "responsibility": "Stratified content-group splitting, MIME sanitization, and vocabulary isolation",
                },
                {
                    "name": "CO5 Quality & Evaluation Specialist",
                    "role": "Statistical Validation & Benchmark QA",
                    "responsibility": "Held-out test partition certification, baseline benchmarking, and hardware profiling",
                },
            ],
        },
    }


@app.get("/api/samples")
def get_samples() -> dict[str, Any]:
    """Returns the verified synthetic email samples library for instant demonstrations."""
    # Format samples cleanly for client cards
    formatted = []
    for title, s in SAMPLE_EMAILS.items():
        if s.get("category") == "None":
            continue
        formatted.append({
            "key": title,
            "title": title.replace("🚨 ", "").replace("✅ ", ""),
            "category": s.get("category"),
            "subject": s.get("subject"),
            "body": s.get("body"),
            "description": s.get("description"),
        })
    return {"samples": formatted}


# =====================================================================
# Authentication & Gmail Session Dependencies
# =====================================================================

def get_authenticated_session(request: Request) -> Optional[dict[str, Any]]:
    """Extracts and validates signed session from HttpOnly cookie or Bearer token."""
    cookie_val = request.cookies.get(SESSION_COOKIE_NAME)
    if not cookie_val:
        auth_hdr = request.headers.get("Authorization", "")
        if auth_hdr.startswith("Bearer "):
            cookie_val = auth_hdr[7:].strip()
    if not cookie_val:
        return None
    auth_mgr = get_auth_manager()
    return auth_mgr.decode_session_token(cookie_val)


def require_authenticated_session(request: Request) -> dict[str, Any]:
    """Guards endpoints requiring an authenticated Google connection."""
    session = get_authenticated_session(request)
    if not session or not session.get("access_token"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please connect your Gmail account.",
        )
    return session


def get_valid_gmail_client(request: Request, response: Optional[Response] = None) -> GmailClient:
    """Provides an active GmailClient, automatically refreshing the token if expired."""
    session = require_authenticated_session(request)
    auth_mgr = get_auth_manager()
    access_token = session.get("access_token", "")
    expires_at = session.get("expires_at", 0)

    # Attempt token refresh if within 60 seconds of expiration
    if time.time() > (expires_at - 60) and session.get("refresh_token"):
        try:
            new_tokens = auth_mgr.refresh_access_token(session["refresh_token"])
            access_token = new_tokens.get("access_token", access_token)
            session["access_token"] = access_token
            session["expires_at"] = time.time() + new_tokens.get("expires_in", 3600)
            if response is not None:
                new_cookie = auth_mgr.create_session_token(session)
                response.set_cookie(
                    key=SESSION_COOKIE_NAME,
                    value=new_cookie,
                    httponly=True,
                    samesite="lax",
                    max_age=60 * 60 * 24 * 7,
                    path="/",
                )
        except Exception as exc:
            logger.warning("Transparent token refresh failed: %s", exc)

    return GmailClient(access_token=access_token)


# =====================================================================
# Google OAuth & Account Management Routes
# =====================================================================

@app.get("/api/auth/status", response_model=GmailAuthStatusResponse)
def get_auth_status(request: Request) -> GmailAuthStatusResponse:
    """Reports Gmail connection state, active account identity, and setup guidance."""
    auth_mgr = get_auth_manager()
    configured = auth_mgr.is_configured()
    session = get_authenticated_session(request)

    instructions = None
    if not configured:
        instructions = {
            "title": "Google Cloud Console Setup Required",
            "steps": [
                "1. Go to Google Cloud Console (https://console.cloud.google.com/)",
                "2. Create a new project named 'SpamGuard AI'",
                "3. Enable the 'Gmail API' under APIs & Services > Enabled APIs & services",
                "4. In 'OAuth consent screen', select User Type 'External', add app name, and add scopes: 'https://www.googleapis.com/auth/gmail.readonly', 'openid', 'email', 'profile'",
                "5. In 'Test users', add your Gmail address (required while app status is in 'Testing')",
                "6. In 'Credentials', click 'Create Credentials' > 'OAuth client ID' > 'Web application'",
                f"7. Add Authorized Redirect URI: {auth_mgr.redirect_uri}",
                "8. Copy the generated Client ID and Client Secret into your .env file as GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET",
            ],
            "redirect_uri": auth_mgr.redirect_uri,
            "required_scopes": GMAIL_SCOPES,
        }

    if not session:
        return GmailAuthStatusResponse(
            authenticated=False,
            configured=configured,
            setup_instructions=instructions,
        )

    return GmailAuthStatusResponse(
        authenticated=True,
        configured=configured,
        email=session.get("email"),
        name=session.get("name"),
        picture=session.get("picture"),
        connected_at=session.get("connected_at"),
        scopes=session.get("scopes", GMAIL_SCOPES),
        setup_instructions=instructions,
    )


@app.get("/api/auth/google/start", response_model=GmailStartResponse)
def start_google_auth() -> GmailStartResponse:
    """Generates official Google OAuth consent URL with cryptographic anti-CSRF state."""
    auth_mgr = get_auth_manager()
    if not auth_mgr.is_configured():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google OAuth credentials not configured on server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.",
        )
    auth_url, state = auth_mgr.get_authorization_url()
    return GmailStartResponse(authorization_url=auth_url, state=state)


@app.get("/api/auth/google/callback")
def google_auth_callback(
    code: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    error: Optional[str] = Query(default=None),
) -> Response:
    """Validates Google OAuth callback parameters and establishes signed session cookie."""
    auth_mgr = get_auth_manager()
    frontend_url = auth_mgr.frontend_url

    if error:
        logger.warning("OAuth error returned by Google: %s", error)
        return RedirectResponse(
            url=f"{frontend_url}/accounts?error={error}",
            status_code=status.HTTP_302_FOUND,
        )

    if not code or not state:
        logger.warning("OAuth callback missing required parameters.")
        return RedirectResponse(
            url=f"{frontend_url}/accounts?error=missing_code_or_state",
            status_code=status.HTTP_302_FOUND,
        )

    if not auth_mgr.validate_state(state):
        logger.warning("OAuth callback state verification failed (possible CSRF attack).")
        return RedirectResponse(
            url=f"{frontend_url}/accounts?error=invalid_csrf_state",
            status_code=status.HTTP_302_FOUND,
        )

    try:
        tokens = auth_mgr.exchange_code(code)
    except Exception as exc:
        logger.error("Token exchange failed during callback: %s", exc)
        return RedirectResponse(
            url=f"{frontend_url}/accounts?error=token_exchange_failed",
            status_code=status.HTTP_302_FOUND,
        )

    access_token = tokens.get("access_token", "")
    refresh_token = tokens.get("refresh_token", "")
    expires_in = tokens.get("expires_in", 3600)
    user_info = auth_mgr.fetch_user_info(access_token)

    session_payload = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": time.time() + expires_in,
        "email": user_info.get("email", "connected_account@gmail.com"),
        "name": user_info.get("name", "Connected User"),
        "picture": user_info.get("picture", ""),
        "connected_at": time.time(),
        "scopes": tokens.get("scope", "").split(),
    }

    session_token = auth_mgr.create_session_token(session_payload)

    redirect_resp = RedirectResponse(
        url=f"{frontend_url}/inbox?status=connected",
        status_code=status.HTTP_302_FOUND,
    )
    redirect_resp.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=60 * 60 * 24 * 7,
        path="/",
    )
    return redirect_resp


@app.post("/api/auth/disconnect")
def disconnect_gmail(request: Request, response: Response) -> dict[str, Any]:
    """Revokes tokens with Google and purges the active session."""
    session = get_authenticated_session(request)
    if session:
        auth_mgr = get_auth_manager()
        tok = session.get("refresh_token") or session.get("access_token")
        if tok:
            auth_mgr.revoke_token(tok)

    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    return {"success": True, "message": "Successfully disconnected Gmail account and revoked tokens."}


# =====================================================================
# Gmail Inbox Retrieval & Classification Routes
# =====================================================================

@app.get("/api/gmail/messages", response_model=GmailListResponse)
def list_gmail_messages(
    request: Request,
    response: Response,
    query: str = Query(default="", max_length=200),
    max_results: int = Query(default=20, ge=1, le=50),
    page_token: Optional[str] = Query(default=None),
) -> GmailListResponse:
    """Lists recent messages with subject, sender, and snippet metadata."""
    client = get_valid_gmail_client(request, response)
    try:
        data = client.list_messages(query=query, max_results=max_results, page_token=page_token)
    except GmailAuthError as ae:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(ae))
    except GmailPermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except GmailRateLimitError as re:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(re))
    except GmailApiError as ge:
        raise HTTPException(status_code=ge.status_code, detail=str(ge))

    msg_refs = data.get("messages", [])
    next_token = data.get("nextPageToken")

    items: List[GmailMessageItem] = []
    for ref in msg_refs:
        mid = ref.get("id")
        if not mid:
            continue
        try:
            raw_msg = client.get_message(mid)
            parsed = parse_gmail_message_payload(raw_msg)
            items.append(
                GmailMessageItem(
                    id=mid,
                    thread_id=ref.get("threadId", ""),
                    sender=parsed.sender,
                    recipient=parsed.recipient,
                    subject=parsed.subject,
                    date=parsed.date,
                    snippet=parsed.snippet,
                    body_preview=parsed.plain_body[:160].strip(),
                    has_html=parsed.has_html,
                    has_attachments=parsed.has_attachments,
                )
            )
        except Exception as exc:
            logger.warning("Error fetching metadata for message %s: %s", mid, exc)
            continue

    return GmailListResponse(
        total_found=len(items),
        next_page_token=next_token,
        messages=items,
    )


@app.post("/api/gmail/scan", response_model=GmailScanResponse)
def scan_recent_gmail_inbox(
    payload: GmailScanRequest,
    request: Request,
    response: Response,
) -> GmailScanResponse:
    """Retrieves and classifies recent mailbox messages with the frozen ML predictor."""
    client = get_valid_gmail_client(request, response)
    scanner = GmailScanner(
        client=client,
        review_threshold_low=_RUNTIME_SETTINGS["threshold_low"],
        review_threshold_high=_RUNTIME_SETTINGS["threshold_high"],
    )

    try:
        summary: GmailScanSummary = scanner.scan_recent_messages(
            max_messages=payload.max_messages,
            query=payload.query,
            explain=payload.explain,
            top_k=payload.top_k,
        )
    except GmailAuthError as ae:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(ae))
    except GmailPermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except GmailRateLimitError as re:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(re))
    except Exception as exc:
        logger.error("Inbox scan failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Inbox scan failed: {exc}")

    return GmailScanResponse(
        total_scanned=summary.total_scanned,
        spam_count=summary.spam_count,
        ham_count=summary.ham_count,
        review_count=summary.review_count,
        spam_percentage=summary.spam_percentage,
        ham_percentage=summary.ham_percentage,
        review_percentage=summary.review_percentage,
        scan_timestamp=summary.scan_timestamp,
        duration_ms=summary.duration_ms,
        items=[
            ScannedEmailModel(
                id=item.id,
                thread_id=item.thread_id,
                sender=item.sender,
                recipient=item.recipient,
                subject=item.subject,
                date=item.date,
                snippet=item.snippet,
                body_preview=item.body_preview,
                predicted_class=item.predicted_class,
                predicted_label=item.predicted_label,
                is_spam=item.is_spam,
                spam_probability=item.spam_probability,
                ham_probability=item.ham_probability,
                review_status=item.review_status,
                confidence_level=item.confidence_level,
                needs_review=item.needs_review,
                processing_time_ms=item.processing_time_ms,
                top_features=[FeatureContributionModel(**f) for f in item.top_features],
                warning_advisory=item.warning_advisory,
                has_html=item.has_html,
                has_attachments=item.has_attachments,
            )
            for item in summary.items
        ],
    )


@app.post("/api/gmail/scan-selected", response_model=GmailScanResponse)
def scan_selected_gmail_messages(
    payload: GmailScanSelectedRequest,
    request: Request,
    response: Response,
) -> GmailScanResponse:
    """Classifies a specific user-selected set of Gmail messages."""
    client = get_valid_gmail_client(request, response)
    scanner = GmailScanner(
        client=client,
        review_threshold_low=_RUNTIME_SETTINGS["threshold_low"],
        review_threshold_high=_RUNTIME_SETTINGS["threshold_high"],
    )

    try:
        summary: GmailScanSummary = scanner.scan_selected_messages(
            message_ids=payload.message_ids,
            explain=payload.explain,
            top_k=payload.top_k,
        )
    except GmailAuthError as ae:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(ae))
    except GmailPermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except GmailRateLimitError as re:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(re))
    except Exception as exc:
        logger.error("Selected messages scan failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Scan failed: {exc}")

    return GmailScanResponse(
        total_scanned=summary.total_scanned,
        spam_count=summary.spam_count,
        ham_count=summary.ham_count,
        review_count=summary.review_count,
        spam_percentage=summary.spam_percentage,
        ham_percentage=summary.ham_percentage,
        review_percentage=summary.review_percentage,
        scan_timestamp=summary.scan_timestamp,
        duration_ms=summary.duration_ms,
        items=[
            ScannedEmailModel(
                id=item.id,
                thread_id=item.thread_id,
                sender=item.sender,
                recipient=item.recipient,
                subject=item.subject,
                date=item.date,
                snippet=item.snippet,
                body_preview=item.body_preview,
                predicted_class=item.predicted_class,
                predicted_label=item.predicted_label,
                is_spam=item.is_spam,
                spam_probability=item.spam_probability,
                ham_probability=item.ham_probability,
                review_status=item.review_status,
                confidence_level=item.confidence_level,
                needs_review=item.needs_review,
                processing_time_ms=item.processing_time_ms,
                top_features=[FeatureContributionModel(**f) for f in item.top_features],
                warning_advisory=item.warning_advisory,
                has_html=item.has_html,
                has_attachments=item.has_attachments,
            )
            for item in summary.items
        ],
    )


# =====================================================================
# System Settings & Review Boundary Routes
# =====================================================================

@app.get("/api/settings", response_model=SettingsResponse)
def get_system_settings() -> SettingsResponse:
    """Returns the current configurable review threshold parameters."""
    return SettingsResponse(
        threshold_low=_RUNTIME_SETTINGS["threshold_low"],
        threshold_high=_RUNTIME_SETTINGS["threshold_high"],
        updated_at=_RUNTIME_SETTINGS["updated_at"],
    )


@app.post("/api/settings", response_model=SettingsResponse)
def update_system_settings(settings: SettingsModel) -> SettingsResponse:
    """Updates the review boundary thresholds for borderline predictions."""
    if settings.threshold_low >= settings.threshold_high:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="threshold_low must be strictly less than threshold_high.",
        )
    _RUNTIME_SETTINGS["threshold_low"] = settings.threshold_low
    _RUNTIME_SETTINGS["threshold_high"] = settings.threshold_high
    _RUNTIME_SETTINGS["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    return SettingsResponse(
        threshold_low=_RUNTIME_SETTINGS["threshold_low"],
        threshold_high=_RUNTIME_SETTINGS["threshold_high"],
        updated_at=_RUNTIME_SETTINGS["updated_at"],
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api:app", host="127.0.0.1", port=8000, reload=False)
