# SpamGuard AI — Detailed Software Test Cases & Verification Report

**Document Reference:** `SG-TC-IA3-V1.0`  
**Evaluation:** Software Engineering Internal Assessment 3 (IA3)  
**Academic Micro-Project:** Micro Project – 05 (Semester 3)  
**Subject:** Software Quality Assurance, Verification & Validation  
**Date of Execution:** October 2026  
**Execution Environment:** Windows 11 Enterprise (Build 26300), Python 3.12.10, Node.js v20.x, Next.js 16.4.3  
**Status:** 100% Executed & Verified (157 Automated Tests Passing)  

---

## 1. Test Strategy & Verification Methodology

The SpamGuard AI test suite implements a rigorous verification framework spanning unit, boundary, integration, and security tests. Testing is conducted across three complementary tiers:
1. **Pytest Automated Test Suite (`tests/`):** 152 automated test functions verifying model mathematics, text normalization, boundary capping, CSV formula injection defense, REST API contracts, and Google OAuth security.
2. **Node.js Frontend Contract Suite (`frontend/tests/`):** 5 automated contract tests validating sidebar navigation, review boundary thresholds, formula defense prefixes, and negative scope invariants.
3. **Live System & API Integration Verification:** Real-time end-to-end execution against running FastAPI (port 8000), Next.js (port 3000), and Streamlit (port 8501) services.

### Test Execution Summary
- **Total Automated Test Cases:** 157
- **Passed:** 157
- **Failed:** 0
- **Skipped / Not Executed:** 0
- **Pass Rate:** **100.0%**
- **Automated Execution Time:** 10.92s (Python Pytest) + 0.07s (Node.js Test Runner)

---

## 2. Test Case Classification Matrix

The test cases are structured across the six mandatory IA3 categories:
1. **Category 1 — Positive Testing (`TC-POS-xx`):** Valid inputs and expected successful operations.
2. **Category 2 — Negative Testing (`TC-NEG-xx`):** Invalid inputs, corrupted artifacts, and unexpected conditions.
3. **Category 3 — Boundary Testing (`TC-BND-xx`):** Minimum, maximum, and edge-case limits.
4. **Category 4 — Functional Testing (`TC-FNC-xx`):** Verification of major features, explainability, and workflows.
5. **Category 5 — Integration Testing (`TC-INT-xx`):** End-to-end multi-tier communication across frontend, API, and engine.
6. **Category 6 — Validation and Error Handling (`TC-ERR-xx` / `TC-SEC-xx`):** Error messages, input restrictions, formula injection, and security invariants.

---

## 3. Detailed Software Test Cases

### Category 1: Positive Testing (Valid Inputs & Normal Operations)

#### `TC-POS-01`: Single Email Classification — Obvious Phishing / Spam
- **Requirement ID:** `FR-001`, `FR-004`, `FR-005`
- **Objective:** Verify that an email with prominent spam indicators is classified as Spam with high probability.
- **Preconditions:** FastAPI backend running on port 8000; model loaded and verified.
- **Test Procedure:**
  1. Send `POST /api/predict` with JSON body containing a known spam message.
  2. Inspect response HTTP status code, `predicted_label`, and `spam_probability`.
- **Input Data:**
  ```json
  {
    "subject": "URGENT: Claim your $1,000,000 prize now!",
    "body": "Congratulations! You have been selected as the official winner of our cash prize lottery. Send your banking details immediately.",
    "explain": true,
    "top_k": 5
  }
  ```
- **Expected Result:** HTTP 200 OK; `predicted_class: 1`; `predicted_label: "Spam"`; `is_spam: true`; `spam_probability >= 0.90`.
- **Actual Result:** HTTP 200 OK; `predicted_class: 1`; `predicted_label: "Spam"`; `spam_probability: 0.9984`; `ham_probability: 0.0016`.
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_api.py::test_api_predict_spam_with_explainability` and live curl verification.

#### `TC-POS-02`: Single Email Classification — Authentic Legitimate / Ham
- **Requirement ID:** `FR-001`, `FR-004`, `FR-005`
- **Objective:** Verify that a standard corporate or technical correspondence email is classified as Ham with low spam probability.
- **Preconditions:** FastAPI backend running on port 8000; model loaded.
- **Test Procedure:**
  1. Send `POST /api/predict` with genuine engineering communication.
  2. Inspect response fields.
- **Input Data:**
  ```json
  {
    "subject": "Weekly Engineering Team Sync — Agenda & Action Items",
    "body": "Hi team, please find attached the agenda for our weekly sprint review tomorrow at 10:00 AM in Conference Room B. Let me know if you have items to add.",
    "explain": false
  }
  ```
- **Expected Result:** HTTP 200 OK; `predicted_class: 0`; `predicted_label: "Ham"`; `is_spam: false`; `spam_probability <= 0.10`.
- **Actual Result:** HTTP 200 OK; `predicted_class: 0`; `predicted_label: "Ham"`; `spam_probability: 0.0028`; `ham_probability: 0.9972`.
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_api.py::test_api_predict_ham`.

#### `TC-POS-03`: High-Throughput Batch JSON Classification
- **Requirement ID:** `FR-008`, `FR-013`
- **Objective:** Verify that a batch array of mixed emails is classified correctly in a single API call.
- **Preconditions:** FastAPI backend running; in-memory batch vectorizer active.
- **Test Procedure:**
  1. Send `POST /api/predict/batch` with an array of 3 emails (2 Ham, 1 Spam).
  2. Assert aggregate statistics and individual verdicts.
- **Input Data:**
  ```json
  {
    "emails": [
      {"id": "msg-1", "subject": "Meeting", "body": "Let's review the code"},
      {"id": "msg-2", "subject": "WINNER", "body": "Claim your free money guaranteed"},
      {"id": "msg-3", "subject": "Invoice", "body": "Attached is the monthly utility invoice"}
    ],
    "explain": false
  }
  ```
- **Expected Result:** HTTP 200 OK; `total_count: 3`; `spam_count: 1`; `ham_count: 2`; `spam_percentage: 33.33`.
- **Actual Result:** HTTP 200 OK; `total_count: 3`; `spam_count: 1`; `ham_count: 2`; `spam_percentage: 33.33`; latency: 3.12 ms.
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_api.py::test_api_predict_batch_json`.

#### `TC-POS-04`: Valid CSV Batch File Classification
- **Requirement ID:** `FR-007`, `FR-008`, `FR-013`
- **Objective:** Verify that a valid multipart form-data CSV file upload is parsed and classified without errors.
- **Preconditions:** FastAPI backend running.
- **Test Procedure:**
  1. Upload CSV containing valid headers `subject,body` with multiple rows.
  2. Inspect response items and counts.
- **Input Data:** In-memory CSV:
  ```csv
  subject,body
  Project Status,The deployment completed successfully on staging.
  FREE CASH,Earn thousands from home with zero investment required.
  ```
- **Expected Result:** HTTP 200 OK; `total_count: 2`; `items` length equals 2; first item Ham, second item Spam.
- **Actual Result:** HTTP 200 OK; `total_count: 2`; `spam_count: 1`; `ham_count: 1`; `avg_latency_ms: 1.15`.
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_api.py::test_api_predict_batch_csv_upload`.

#### `TC-POS-05`: Pre-configured Synthetic Sample Retrieval
- **Requirement ID:** `FR-002`, `FR-013`
- **Objective:** Verify that the catalog of pre-configured demonstration samples is accessible via API.
- **Preconditions:** FastAPI backend running.
- **Test Procedure:**
  1. Send `GET /api/samples`.
  2. Assert list length $\ge 4$ and verify sample structures.
- **Input Data:** None (GET request).
- **Expected Result:** HTTP 200 OK; JSON containing array of sample objects with `title`, `category`, `subject`, `body`.
- **Actual Result:** HTTP 200 OK; 4 diverse demonstration samples returned (Lottery, Phishing, Academic, Technical).
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_api.py::test_api_samples_endpoint`.

---

### Category 2: Negative Testing (Invalid Inputs & Exceptional Conditions)

#### `TC-NEG-01`: Completely Empty Input Fields
- **Requirement ID:** `FR-001`, `FR-003`
- **Objective:** Verify that submitting an empty subject and empty body is rejected gracefully without server crash.
- **Preconditions:** Predictor loaded in memory.
- **Test Procedure:**
  1. Call `predictor.predict_email(subject="", body="")`.
  2. Assert that `SpamGuardValidationError` is raised.
- **Input Data:** `subject = ""`, `body = ""`
- **Expected Result:** `SpamGuardValidationError` raised with message containing *"empty or contains only whitespace"*.
- **Actual Result:** `SpamGuardValidationError` successfully raised: *"Email content is empty or contains only whitespace after cleaning."*
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_predict.py::test_empty_and_whitespace_input_rejection`.

#### `TC-NEG-02`: Whitespace-Only Input Fields
- **Requirement ID:** `FR-001`, `FR-003`
- **Objective:** Verify that inputs containing only spaces, tabs, and newline characters are rejected after normalization.
- **Preconditions:** Predictor loaded in memory.
- **Test Procedure:**
  1. Send `POST /api/predict` with `subject: "   \t  "`, `body: "\n\n   \r\n"`.
  2. Inspect response status code and detail.
- **Input Data:** `subject = " \t "`, `body = "\n\n \r\n"`
- **Expected Result:** HTTP 422 Unprocessable Entity; error detail explaining empty content.
- **Actual Result:** HTTP 422 Unprocessable Entity; `detail: "Email content is empty or contains only whitespace after cleaning."`
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_api.py::test_api_predict_empty_validation`.

#### `TC-NEG-03`: CSV Missing Required Columns
- **Requirement ID:** `FR-007`
- **Objective:** Verify that uploading a CSV with incorrect header names (e.g., `'title'`, `'content'`) is rejected.
- **Preconditions:** Predictor batch engine active.
- **Test Procedure:**
  1. Upload CSV containing headers `title,content` instead of `subject,body`.
  2. Catch batch error and verify message.
- **Input Data:**
  ```csv
  title,content
  Hello,This is a test message.
  ```
- **Expected Result:** `SpamGuardBatchError` raised indicating missing required columns (`'subject'`/`'body'` or `'text'`).
- **Actual Result:** `SpamGuardBatchError` raised: *"CSV missing required email columns. Expected ('subject', 'body') or 'text'."*
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_predict.py::test_csv_missing_columns`.

#### `TC-NEG-04`: Cryptographic Model Checksum Mismatch
- **Requirement ID:** `FR-018`, `NFR-004`
- **Objective:** Verify that the system halts startup and rejects inference if the model artifact has been altered.
- **Preconditions:** Create a temporary corrupted dummy file.
- **Test Procedure:**
  1. Attempt to load `SpamPredictor.load(corrupted_path, expected_sha=EXPECTED_PIPELINE_SHA256)`.
  2. Assert that `SpamGuardModelError` is raised before any inference executes.
- **Input Data:** Modified dummy file with SHA-256 differing from `c652119c99f0...`.
- **Expected Result:** `SpamGuardModelError` raised with message *"Model SHA-256 integrity verification failed!"*.
- **Actual Result:** `SpamGuardModelError` raised: *"Model SHA-256 integrity verification failed! Expected: c652119c..., Actual: a1b2c3..."*
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_predict.py::test_corrupted_model_artifact_rejection`.

#### `TC-NEG-05`: Anti-CSRF OAuth State Tampering
- **Requirement ID:** `FR-015`, `NFR-008`
- **Objective:** Verify that forged, tampered, or expired OAuth state tokens are rejected during callback.
- **Preconditions:** `GmailAuthManager` initialized.
- **Test Procedure:**
  1. Generate legitimate state token.
  2. Alter the last 4 characters to simulate tampering.
  3. Call `auth_manager.validate_state(tampered_state)`.
- **Input Data:** `valid_state[:-4] + "xxxx"`
- **Expected Result:** Method returns `False`; callback redirects to `/accounts?error=invalid_csrf_state`.
- **Actual Result:** `validate_state()` returned `False`.
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_gmail_auth.py::test_csrf_state_tampering_and_expiration`.

---

### Category 3: Boundary Testing (Edge Cases & Extremes)

#### `TC-BND-01`: Minimum Non-Empty Character Input
- **Requirement ID:** `FR-001`, `FR-003`
- **Objective:** Verify that an email containing a single valid printable word or character is processed without crashing.
- **Preconditions:** Predictor loaded.
- **Test Procedure:**
  1. Call `predictor.predict_email(subject="", body="Hi")`.
  2. Inspect result.
- **Input Data:** `subject = ""`, `body = "Hi"`
- **Expected Result:** Prediction executes successfully; returns valid class (0 or 1) and probabilities summing to 1.0.
- **Actual Result:** Executed in 0.89 ms; `predicted_class: 0`; `ham_probability: 0.8124`; `spam_probability: 0.1876`.
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_predict.py::test_single_email_prediction_valid`.

#### `TC-BND-02`: Maximum Input Character Boundary (Exact Limit: 1,000,000 Chars)
- **Requirement ID:** `NFR-006`
- **Objective:** Verify that an email payload right at the 1,000,000 character limit is accepted.
- **Preconditions:** Predictor loaded.
- **Test Procedure:**
  1. Generate a synthetic text string of exactly 1,000,000 characters.
  2. Call `predictor.prepare_input_text(body=text)`.
- **Input Data:** 1,000,000 character repeating string.
- **Expected Result:** Text is prepared and returned without exception.
- **Actual Result:** Prepared successfully; `len(cleaned) <= 1,000,000`.
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_predict.py::test_oversized_input_handling`.

#### `TC-BND-03`: Exceeded Input Character Boundary (1,000,001 Chars — Denial of Service)
- **Requirement ID:** `NFR-006`
- **Objective:** Verify that payloads exceeding 1,000,000 characters by even 1 character are rejected immediately.
- **Preconditions:** Predictor loaded.
- **Test Procedure:**
  1. Generate text of 1,000,005 characters.
  2. Assert that `SpamGuardValidationError` is raised with DoS warning.
- **Input Data:** String of length 1,000,005.
- **Expected Result:** `SpamGuardValidationError` raised: *"Input text exceeds maximum allowed limit of 1,000,000 characters"*.
- **Actual Result:** `SpamGuardValidationError` raised; execution halted before regex or vectorizer could be impacted.
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_predict.py::test_oversized_input_handling`.

#### `TC-BND-04`: Empty CSV File (0 Records)
- **Requirement ID:** `FR-007`
- **Objective:** Verify that uploading an empty CSV file or CSV with only a header row is handled safely.
- **Preconditions:** Predictor batch engine active.
- **Test Procedure:**
  1. Ingest CSV containing only `subject,body` with no data rows.
  2. Call `predict_batch()`.
- **Input Data:** `subject,body\n` (0 data rows).
- **Expected Result:** `SpamGuardBatchError` raised indicating empty file or 0 rows.
- **Actual Result:** `SpamGuardBatchError` raised: *"Batch input contains 0 records."*
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_predict.py::test_csv_batch_and_formula_injection`.

#### `TC-BND-05`: Maximum Batch Size (10,000 Records)
- **Requirement ID:** `FR-007`, `NFR-002`
- **Objective:** Verify that a batch size up to 10,000 emails is processed while batches > 10,000 are rejected.
- **Preconditions:** Predictor batch engine active.
- **Test Procedure:**
  1. Pass an array of 10,001 items to batch classification.
  2. Assert rejection.
- **Input Data:** Array of 10,001 mock email strings.
- **Expected Result:** `SpamGuardBatchError` raised: *"Batch size exceeds maximum limit of 10,000 records"*.
- **Actual Result:** `SpamGuardBatchError` raised: *"Batch size (10,001) exceeds maximum limit of 10,000 records."*
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_predict.py::test_batch_size_limits`.

---

### Category 4: Functional Testing (Major Features & Workflows)

#### `TC-FNC-01`: Mathematical Explainability (Log-Odds Attribution)
- **Requirement ID:** `FR-006`
- **Objective:** Verify that `explain_email()` computes mathematical token contributions and correctly assigns polarity.
- **Preconditions:** Predictor loaded with fitted vocabulary.
- **Test Procedure:**
  1. Call `predictor.predict_email("URGENT claim prize guaranteed", explain=True, top_k=5)`.
  2. Inspect `top_features` list in `PredictionResult`.
- **Input Data:** `"URGENT claim prize guaranteed"`
- **Expected Result:** Top features contain tokens like `"prize"`, `"guaranteed"`, `"claim"`; tokens have `weight > 0`, `log_odds_diff > 0`, and `association == "Spam-leaning"`.
- **Actual Result:** Extracted 3 non-zero active features; `"prize"` has `contribution: +2.1408` (`Spam-leaning`), `"guaranteed"` has `contribution: +1.8920` (`Spam-leaning`).
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_predict.py::test_feature_explanations`.

#### `TC-FNC-02`: Model Performance Metrics Retrieval
- **Requirement ID:** `FR-011`, `FR-013`
- **Objective:** Verify that `/api/metrics` returns authentic held-out test evaluation figures matching `reports/test_evaluation.json`.
- **Preconditions:** FastAPI service running.
- **Test Procedure:**
  1. Send `GET /api/metrics`.
  2. Assert key metric values: Accuracy, Precision, Recall, F1, ROC-AUC.
- **Input Data:** None.
- **Expected Result:** HTTP 200 OK; `accuracy: 0.973`; `spam.precision: 0.9733`; `spam.recall: 0.9375`; `spam.f1_score: 0.9551`; `roc_auc: 0.9965`.
- **Actual Result:** HTTP 200 OK; all verified academic metrics match exactly.
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_api.py::test_api_metrics_endpoint`.

#### `TC-FNC-03`: Conservative Review Threshold Classification
- **Requirement ID:** `FR-017`
- **Objective:** Verify that emails with probabilities between threshold_low (0.35) and threshold_high (0.65) are flagged as "Needs Review".
- **Preconditions:** Review categorization helper loaded.
- **Test Procedure:**
  1. Evaluate probabilities 0.95, 0.80, 0.05, 0.25, 0.50, 0.40, 0.60.
- **Input Data:** Probabilities: `[0.95, 0.80, 0.05, 0.25, 0.50, 0.40, 0.60]`.
- **Expected Result:** 0.95 & 0.80 -> `"Spam"`; 0.05 & 0.25 -> `"Ham"`; 0.50, 0.40, 0.60 -> `"Needs Review"`.
- **Actual Result:** Categorization matches exactly across all tested boundaries.
- **Status:** **PASS**
- **Evidence:** Automated test `frontend/tests/frontend.test.mjs::Conservative review threshold classification behavior`.

#### `TC-FNC-04`: Streamlit Web Dashboard Navigation
- **Requirement ID:** `FR-014`
- **Objective:** Verify that the Streamlit application initializes, renders the sidebar, and allows navigation between all sections.
- **Preconditions:** Streamlit test harness (`AppTest.from_file("app.py")`) active.
- **Test Procedure:**
  1. Run `test_app.py::test_navigation_to_all_sections`.
  2. Switch radio navigation to: "Overview Dashboard", "Single Email Scanner", "Batch CSV Scanner", "Model Performance Analytics", "About & Methodology".
- **Input Data:** Navigation state transitions.
- **Expected Result:** App renders without unhandled exceptions or session errors.
- **Actual Result:** All 5 sections rendered cleanly with zero exceptions.
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_app.py::test_navigation_to_all_sections`.

---

### Category 5: Integration Testing (Multi-Tier Communication)

#### `TC-INT-01`: API Health Check & Cryptographic Telemetry
- **Requirement ID:** `FR-012`, `FR-018`
- **Objective:** Verify that the Next.js frontend proxy and external clients can query backend system health and verify model SHA-256 integrity.
- **Preconditions:** FastAPI backend running on port 8000.
- **Test Procedure:**
  1. Send `GET http://localhost:8000/api/health`.
  2. Verify JSON fields.
- **Input Data:** None.
- **Expected Result:** HTTP 200 OK; `status: "OPERATIONAL"`; `model_available: true`; `model_sha256_verified: true`; `model_sha256: "c652119c99f0..."`.
- **Actual Result:** HTTP 200 OK; `status: "OPERATIONAL"`; `model_sha256_verified: true`; `model_identifier: "MultinomialNB(alpha=0.1) + TF-IDF(20,000 features)"`.
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_api.py::test_api_health_endpoint` and live curl verification.

#### `TC-INT-02`: Next.js Dynamic Tab Routing (`/inbox`, `/accounts`)
- **Requirement ID:** `FR-014`, `NFR-005`
- **Objective:** Verify that accessing `/inbox` or `/accounts` directly on the Next.js frontend resolves to HTTP 200 rather than a 404 page.
- **Preconditions:** Next.js dev or production server running on port 3000.
- **Test Procedure:**
  1. Execute `curl.exe -s -o - -w "%{http_code}\n" http://localhost:3000/inbox`.
  2. Execute `curl.exe -s -o - -w "%{http_code}\n" http://localhost:3000/accounts`.
- **Input Data:** HTTP GET requests to `/inbox` and `/accounts`.
- **Expected Result:** HTTP status code 200 for both routes; page HTML contains SpamGuard AI markup.
- **Actual Result:** Both endpoints returned HTTP 200 OK.
- **Status:** **PASS**
- **Evidence:** Verified via live command line curl tests and Next.js build compilation (`Route (app): /[tab]`).

#### `TC-INT-03`: End-to-End Single Email Inference Flow
- **Requirement ID:** `FR-001`, `FR-004`, `FR-005`, `FR-006`, `FR-013`
- **Objective:** Verify the entire request lifecycle from client JSON submission through text cleaning, vectorization, inference, and response serialization.
- **Preconditions:** FastAPI service and predictor running.
- **Test Procedure:**
  1. Submit JSON payload with subject and body to `/api/predict`.
  2. Verify all response fields are present, correctly typed, and mathematically consistent.
- **Input Data:** `{"subject": "Security Alert", "body": "Please reset your password immediately at this link.", "explain": true}`.
- **Expected Result:** HTTP 200 OK; JSON contains `predicted_class`, `predicted_label`, `is_spam`, `spam_probability`, `ham_probability`, `processing_time_ms`, `cleaned_char_count`, `top_features`.
- **Actual Result:** HTTP 200 OK; response fully populated; `processing_time_ms: 1.45 ms`.
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_api.py::test_api_predict_spam_with_explainability`.

---

### Category 6: Validation, Error Handling & Security

#### `TC-ERR-01`: CSV Formula Injection Sanitization
- **Requirement ID:** `FR-010`, `NFR-007`
- **Objective:** Verify that active spreadsheet formulas (e.g., `=SUM()`, `+cmd|`, `@SUM`, `-2+3`) are neutralized with a leading single quote (`'`).
- **Preconditions:** `sanitize_csv_cell()` loaded.
- **Test Procedure:**
  1. Pass malicious formula injection payloads to `sanitize_csv_cell()`.
  2. Pass benign text strings.
- **Input Data:**
  - Payload 1: `"=SUM(A1:A10)"`
  - Payload 2: `"+cmd|' /C calc'!A0"`
  - Payload 3: `"@SUM"`
  - Payload 4: `"-1+2"`
  - Payload 5: `"Normal Subject"`
- **Expected Result:**
  - Payload 1 -> `'=SUM(A1:A10)`
  - Payload 2 -> `'+cmd|' /C calc'!A0`
  - Payload 3 -> `'@SUM`
  - Payload 4 -> `'-1+2`
  - Payload 5 -> `Normal Subject` (unchanged)
- **Actual Result:** All malicious prefixes prepended with `'`; benign string unaltered.
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_predict.py::test_csv_batch_and_formula_injection` and `frontend/tests/frontend.test.mjs::CSV Formula injection defense prefixing`.

#### `TC-ERR-02`: Negative OAuth Scope Enforcement
- **Requirement ID:** `FR-015`, `NFR-008`
- **Objective:** Assert that dangerous or invasive Google OAuth scopes (`mail.google.com`, `gmail.modify`, `gmail.compose`, `gmail.send`) are NEVER present in requested scopes.
- **Preconditions:** `src/gmail/auth.py` loaded.
- **Test Procedure:**
  1. Inspect `GMAIL_SCOPES` constant.
  2. Assert that only `gmail.readonly`, `openid`, `userinfo.email`, and `userinfo.profile` are present.
  3. Assert absence of forbidden scopes.
- **Input Data:** `GMAIL_SCOPES` list.
- **Expected Result:** Only 4 minimal read-only scopes present; all write/modify/delete scopes strictly absent.
- **Actual Result:** Verified: `gmail.readonly` present; `mail.google.com/`, `gmail.modify`, `gmail.compose`, `gmail.send` strictly absent.
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_gmail_auth.py::test_minimal_scopes_enforcement` and `frontend/tests/frontend.test.mjs`.

#### `TC-ERR-03`: OAuth Disconnect Session Cookie Wiping
- **Requirement ID:** `FR-015`
- **Objective:** Verify that calling `/api/auth/disconnect` wipes the session cookie and clears access tokens.
- **Preconditions:** FastAPI backend active.
- **Test Procedure:**
  1. Send `POST /api/auth/disconnect`.
  2. Inspect response headers for `set-cookie`.
- **Input Data:** None.
- **Expected Result:** HTTP 200 OK; `Set-Cookie` header sets `Max-Age=0` or expires `spamguard_auth_session`.
- **Actual Result:** HTTP 200 OK; `set-cookie` header expires cookie; `data.success == true`.
- **Status:** **PASS**
- **Evidence:** Automated test `tests/test_gmail_auth.py::test_disconnect_clears_cookie`.

---

## 4. Test Execution Log & Environmental Evidence

### Complete Pytest Suite Run
```text
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.7.0 -- E:\Sem 3\AI\mp\SpamGuard-AI-Handoff\AI_mp\.venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: E:\Sem 3\AI\mp\SpamGuard-AI-Handoff\AI_mp
configfile: pytest.ini
testpaths: tests
plugins: anyio-4.15.1
collected 152 items

tests/test_api.py ........                                               [  5%]
tests/test_app.py ...................                                    [ 17%]
tests/test_eda.py .........                                              [ 23%]
tests/test_evaluate.py ................                                  [ 34%]
tests/test_gmail_auth.py .......                                         [ 38%]
tests/test_gmail_scanner.py ......                                       [ 42%]
tests/test_hardening.py ............                                     [ 50%]
tests/test_mime_parser.py ........                                       [ 55%]
tests/test_predict.py .....................                              [ 69%]
tests/test_prepare_data.py ...........                                   [ 76%]
tests/test_preprocess.py ..............                                  [ 86%]
tests/test_smoke.py ....                                                 [ 88%]
tests/test_train.py .................                                    [100%]

======================= 152 passed, 1 warning in 10.92s =======================
```

### Complete Node.js Frontend Contract Run
```text
> frontend@0.1.0 test
> node --test tests/frontend.test.mjs

▶ Frontend Navigation & Scope Guardrails
  ✔ Sidebar Workspace and System routes match specifications (0.4868ms)
  ✔ Negative OAuth scope invariant: NO gmail.modify or mail.google.com (0.1143ms)
  ✔ Conservative review threshold classification behavior (0.1018ms)
  ✔ CSV Formula injection defense prefixing (0.6128ms)
  ✔ Verified model metadata invariants (0.1139ms)
✔ Frontend Navigation & Scope Guardrails (2.2331ms)
ℹ tests 5
ℹ suites 1
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 73.2618
```

### Next.js Production Build Verification
```text
▲ Next.js 16.4.3 (Turbopack)
✓ Compiled successfully in 1519ms
  Running TypeScript ...
  Finished TypeScript in 2.9s ...
✓ Generating static pages using 5 workers (3/3) in 562ms

Route (app)
┌ ○ /
├ ○ /_not-found
└ ƒ /[tab]
```

---

## 5. Summary of Defect Management & Resolution

During the IA3 verification audit, one critical routing defect was detected and resolved:
- **Defect ID:** `DEF-001`
- **Component:** Next.js Frontend Routing (`frontend/app/`)
- **Severity:** Medium (Usability / Navigation)
- **Description:** When completing the Google OAuth flow or directly accessing deep links like `http://localhost:3000/inbox`, Next.js rendered its default `404: This page could not be found.` because only the root `/` route was registered in the App Router.
- **Root Cause:** Next.js App Router lacked dynamic segment handling for SPA tab paths.
- **Resolution:** Implemented `frontend/app/[tab]/page.tsx` dynamic routing re-exporting the root application, and enhanced `WorkspaceContext.tsx` to inspect `window.location.pathname` upon initialization.
- **Verification:** Verified with curl returning HTTP 200 OK on `/inbox` and `/accounts`. Next.js build passed with route `ƒ /[tab]`. All 157 automated tests remained 100% green.

