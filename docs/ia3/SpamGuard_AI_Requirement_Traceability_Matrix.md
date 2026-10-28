# SpamGuard AI — Requirement Traceability Matrix (RTM)

**Document Reference:** `SG-RTM-IA3-V1.0`  
**Evaluation:** Software Engineering Internal Assessment 3 (IA3)  
**Academic Micro-Project:** Micro Project – 05 (Semester 3)  
**Subject:** Software Engineering Traceability & Verification Audit  
**Date of Release:** October 2026  
**Status:** 100% Traceable & Verified  

---

## 1. Traceability Purpose & Architecture

The Requirement Traceability Matrix (RTM) establishes bidirectional traceability across the entire lifecycle of SpamGuard AI:
$$\text{Software Requirements (SRS)} \iff \text{Design Artifacts (UML)} \iff \text{Implementation Source Code} \iff \text{Verification Test Cases}$$

This matrix guarantees that:
1. Every functional requirement (FR) and non-functional requirement (NFR) in `SpamGuard_AI_SRS.md` is realized by specific, verified source code modules.
2. Every major user interaction is modeled in at least one standard UML diagram.
3. Every requirement is validated by an executed, passing test case with recorded evidence.
4. No orphan code or unverified specification exists in the project repository.

---

## 2. Bidirectional Requirement Traceability Table

| Requirement ID | Requirement Description | Implementing Module(s) & Files | Related Use Case | Primary UML Diagram(s) | Test Case ID | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **FR-001** | Email Subject and Body entry fields | `src/predict.py`<br/>`frontend/components/EmailScanner.tsx`<br/>`app.py` | `UC-01` | **UML-01** (Use Case)<br/>**UML-03** (Sequence)<br/>**UML-04** (Activity) | `TC-POS-01`<br/>`test_app.py::test_single_email_ham_classification` | **PASS** |
| **FR-002** | Synthetic demonstration sample selection | `src/ui_helpers.py`<br/>`src/api.py` (`/api/samples`) | `UC-01` | **UML-01** (Use Case)<br/>**UML-03** (Sequence) | `TC-POS-05`<br/>`test_api.py::test_api_samples_endpoint` | **PASS** |
| **FR-003** | Text preprocessing, NFKC normalization & empty validation | `src/preprocess.py` (`clean_text`)<br/>`src/predict.py` (`prepare_input_text`) | `UC-01` | **UML-03** (Sequence)<br/>**UML-04** (Activity)<br/>**UML-05** (State Machine) | `TC-NEG-01`<br/>`TC-NEG-02`<br/>`test_preprocess.py::test_unicode_normalization` | **PASS** |
| **FR-004** | Binary threat classification (Spam / Ham) | `src/predict.py` (`predict_email`)<br/>`models/spam_pipeline.joblib` | `UC-01` | **UML-01** (Use Case)<br/>**UML-02** (Class)<br/>**UML-03** (Sequence)<br/>**UML-04** (Activity) | `TC-POS-01`<br/>`TC-POS-02`<br/>`test_predict.py::test_single_email_prediction_valid` | **PASS** |
| **FR-005** | Calibrated posterior probability calculation & visual gauge | `src/predict.py` (`predict_proba`)<br/>`src/api.py` (`/api/predict`) | `UC-01` | **UML-01** (Use Case)<br/>**UML-03** (Sequence)<br/>**UML-04** (Activity) | `TC-POS-01`<br/>`TC-POS-02`<br/>`test_predict.py::test_probability_sums_to_one` | **PASS** |
| **FR-006** | Mathematical token log-odds explainability | `src/predict.py` (`explain_email`)<br/>`FeatureContribution` dataclass | `UC-02` | **UML-01** (Use Case)<br/>**UML-02** (Class)<br/>**UML-03** (Sequence)<br/>**UML-04** (Activity) | `TC-FNC-01`<br/>`test_predict.py::test_feature_explanations` | **PASS** |
| **FR-007** | Batch CSV upload and schema validation | `src/predict.py` (`predict_batch`)<br/>`src/api.py` (`/api/predict/csv`)<br/>`frontend/components/BatchScanner.tsx` | `UC-03` | **UML-01** (Use Case)<br/>**UML-04** (Activity)<br/>**UML-05** (State Machine) | `TC-POS-04`<br/>`TC-NEG-03`<br/>`test_predict.py::test_csv_missing_columns` | **PASS** |
| **FR-008** | Vectorized bulk batch inference | `src/predict.py` (`predict_batch`)<br/>`src/api.py` (`/api/predict/batch`) | `UC-03` | **UML-01** (Use Case)<br/>**UML-02** (Class)<br/>**UML-05** (State Machine) | `TC-POS-03`<br/>`TC-POS-04`<br/>`test_predict.py::test_batch_prediction_vectorized` | **PASS** |
| **FR-009** | Batch classification filtering (All, Spam, Ham, Review) | `frontend/components/BatchScanner.tsx`<br/>`app.py` | `UC-03` | **UML-01** (Use Case)<br/>**UML-05** (State Machine) | `test_app.py::test_batch_scanner_view`<br/>`frontend.test.mjs` | **PASS** |
| **FR-010** | Spreadsheet formula injection defense & CSV export | `src/predict.py` (`sanitize_csv_cell`)<br/>`frontend/components/BatchScanner.tsx` | `UC-03` | **UML-01** (Use Case)<br/>**UML-04** (Activity) | `TC-ERR-01`<br/>`test_predict.py::test_csv_batch_and_formula_injection` | **PASS** |
| **FR-011** | Model performance analytics & confusion matrix review | `src/evaluate.py`<br/>`reports/test_evaluation.json`<br/>`frontend/components/ModelAnalytics.tsx` | `UC-04` | **UML-01** (Use Case)<br/>**UML-02** (Class) | `TC-FNC-02`<br/>`test_evaluate.py::test_confusion_matrix_orientation` | **PASS** |
| **FR-012** | REST API health check & runtime telemetry | `src/api.py` (`/api/health`)<br/>`SystemHealthResponse` model | `UC-06` | **UML-01** (Use Case)<br/>**UML-02** (Class) | `TC-INT-01`<br/>`test_api.py::test_api_health_endpoint` | **PASS** |
| **FR-013** | Typed REST prediction endpoints (single, batch, CSV) | `src/api.py`<br/>`PredictRequest`, `PredictResponse` | `UC-01`<br/>`UC-03` | **UML-02** (Class)<br/>**UML-03** (Sequence) | `TC-INT-03`<br/>`test_api.py::test_api_predict_batch_json` | **PASS** |
| **FR-014** | Dual presentation architecture & application fallback | `frontend/` (Next.js port 3000)<br/>`app.py` (Streamlit port 8501) | `UC-01` | **UML-01** (Use Case)<br/>**UML-02** (Class) | `TC-INT-02`<br/>`TC-FNC-04`<br/>`test_app.py::test_app_initialization` | **PASS** |
| **FR-015** | Google OAuth 2.0 lifecycle & anti-CSRF token signing | `src/gmail/auth.py`<br/>`GmailAuthManager`<br/>`src/api.py` | `UC-05` | **UML-01** (Use Case)<br/>**UML-02** (Class) | `TC-NEG-05`<br/>`TC-ERR-02`<br/>`test_gmail_auth.py::test_csrf_state_tampering_and_expiration` | **PASS** |
| **FR-016** | Live Gmail mailbox threat scanning | `src/gmail/client.py`<br/>`src/gmail/scanner.py`<br/>`frontend/components/GmailInboxView.tsx` | `UC-05` | **UML-01** (Use Case)<br/>**UML-02** (Class) | `test_gmail_scanner.py::test_gmail_scanner_basic_scan` | **PASS** |
| **FR-017** | Runtime uncertainty review margin thresholds | `src/api.py` (`/api/settings`)<br/>`frontend/components/SettingsView.tsx` | `UC-05` | **UML-01** (Use Case)<br/>**UML-05** (State Machine) | `TC-FNC-03`<br/>`frontend.test.mjs::Conservative review threshold classification behavior` | **PASS** |
| **FR-018** | Pre-inference model SHA-256 integrity verification | `src/predict.py` (`compute_file_sha256`)<br/>`EXPECTED_PIPELINE_SHA256` | `UC-06` | **UML-01** (Use Case)<br/>**UML-04** (Activity)<br/>**UML-05** (State Machine) | `TC-NEG-04`<br/>`TC-INT-01`<br/>`test_evaluate.py::test_load_trusted_pipeline_checksum_mismatch` | **PASS** |

---

## 3. Non-Functional Requirement Traceability

| Requirement ID | Quality Category | Target Metric / Acceptance Criterion | Verification Method | Executed Evidence | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **NFR-001** | Performance | Single-email inference latency $\le 50.0$ ms | Benchmark script execution | Median latency **1.04 ms** (45x faster than target) | **PASS** |
| **NFR-002** | Performance | Batch throughput $> 5,000$ emails/sec | Vectorized array benchmark | **12,315 emails/sec** on 1,000 records | **PASS** |
| **NFR-003** | Accuracy | Accuracy $\ge 95\%$, FPR $\le 2.0\%$, Spam F1 $\ge 95\%$ | Held-out test evaluation ($n=889$) | Accuracy **97.30%**, FPR **1.13%**, F1 **95.51%** | **PASS** |
| **NFR-004** | Reliability | 100% deterministic output on identical inputs | Pytest parameterization | `test_deterministic_predictions` passes | **PASS** |
| **NFR-005** | Availability | Full operational redundancy via Streamlit | Independent process launch | Streamlit runs independently on port 8501 | **PASS** |
| **NFR-006** | Security | Reject single payload $> 1,000,000$ characters | Unit test bounds violation | `TC-BND-03`: `SpamGuardValidationError` raised | **PASS** |
| **NFR-007** | Security | Neutralize leading formula prefixes (`=`, `+`, `-`, `@`) | Unit & frontend contract test | `TC-ERR-01`: `=SUM(A1:A10)` -> `'=SUM(A1:A10)` | **PASS** |
| **NFR-008** | Security | Anti-CSRF 15-min expiry & signed HttpOnly cookies | Cryptographic serializer test | `test_csrf_state_tampering_and_expiration` passes | **PASS** |
| **NFR-009** | Privacy | Zero persistence of email body text to disk | Architecture & code audit | Memory-only buffers; zero database storage | **PASS** |
| **NFR-010** | Maintainability | Automated test pass rate $\ge 90\%$ | Automated test execution | **157 / 157 tests pass (100.0%)** | **PASS** |
| **NFR-011** | Portability | Cross-platform compatibility (Windows, Linux, macOS) | `pathlib.Path` audit & OS test | Tested on Windows 11 Build 26300 | **PASS** |
| **NFR-012** | Usability | Responsive dark-mode across Desktop, Tablet, Mobile | Viewport screenshot audit | Tested at 1920px, 1366px, 768px, 390px | **PASS** |

---

## 4. UML Diagram Coverage & Alignment Matrix

| UML Diagram Identifier | File Name | Diagram Title & Scope | Addressed Requirements | Associated Use Cases |
| :--- | :--- | :--- | :--- | :--- |
| **UML-01** | `01_use_case.puml` | System Use Case Diagram (Actors, Boundary, Relationships) | `FR-001` to `FR-018` | `UC-01` through `UC-06` |
| **UML-02** | `02_class_diagram.puml` | Domain & Architectural Class Diagram | `FR-004`, `FR-006`, `FR-008`, `FR-012`, `FR-013`, `FR-015` | `UC-01`, `UC-02`, `UC-03`, `UC-05` |
| **UML-03** | `03_sequence_diagram.puml` | Single Email Classification End-to-End Sequence Diagram | `FR-001`, `FR-003`, `FR-004`, `FR-005`, `FR-006`, `FR-013` | `UC-01`, `UC-02` |
| **UML-04** | `04_activity_diagram.puml` | Threat Classification Process & Decision Logic Activity Diagram | `FR-001`, `FR-003`, `FR-004`, `FR-006`, `FR-010`, `FR-018` | `UC-01`, `UC-02` |
| **UML-05** | `05_state_machine.puml` | Email Scan Lifecycle Finite State Machine Diagram | `FR-001`, `FR-003`, `FR-004`, `FR-007`, `FR-017`, `FR-018` | `UC-01`, `UC-03` |

---

## 5. Traceability Audit Conclusion

Every requirement in `SpamGuard_AI_SRS.md` maps directly to verified source code files, structural UML models, and passing test cases. There are **zero untraced requirements**, **zero failing test cases**, and **zero unverified architectural components**.

