# SpamGuard AI — Software Engineering IA3 Demonstration & Setup Guide

**Document Reference:** `SG-DEMO-IA3-V1.0`  
**Evaluation:** Software Engineering Internal Assessment 3 (IA3) Live Demonstration  
**Academic Micro-Project:** Micro Project – 05 (Semester 3)  
**Integrated Course Outcomes:** CO2 (Algorithm Selection), CO4 (Model Engineering), CO5 (Evaluation Metrics)  
**Target Audience:** Academic Review Panel, External Evaluators, Faculty Supervisors  
**Release Date:** October 2026  
**System Status:** Operational, Frozen Model Verified (`c652119c99f0...`), Dual Frontends Active  

---

## 1. Project Overview & Demonstration Objectives

### 1.1 Problem Statement
Unsolicited electronic mail (spam) represents over 45% of global email volume, functioning as a primary delivery mechanism for credential harvesting, financial advance-fee fraud, and phishing campaigns. Rule-based filters frequently fail against obfuscated keywords, while deep learning architectures impose heavy memory footprints and opaque "black-box" decision paths.

SpamGuard AI addresses this challenge with a lightweight, mathematically interpretable classification engine utilizing sublinear **TF-IDF unigram/bigram vectorization** (20,000 features) and an optimized **Multinomial Naïve Bayes** classifier ($\alpha = 0.1$).

### 1.2 Demonstration Objectives for the IA3 Evaluation Committee
During the 10-15 minute IA3 demonstration, the presenter will verify:
1. **Live Dual Architecture:** Simultaneous execution of the Next.js modern frontend (port 3000), FastAPI microservice (port 8000), and Streamlit fallback (port 8501).
2. **Single Email Threat Inspection:** Real-time classification of sample spam and legitimate emails with calibrated probabilities and sub-5ms response time.
3. **Model Explainability:** Mathematical token attribution using Naïve Bayes log-odds difference.
4. **Vectorized Batch CSV Scanning:** Rapid bulk processing of tabular email datasets with spreadsheet formula injection defense.
5. **Empirical Academic Analytics:** Verification of held-out test evaluation figures (97.30% Accuracy, 97.33% Precision, 1.13% False Positive Rate, 0.9965 ROC-AUC) against the zero-intelligence majority baseline.
6. **Defensive Validation & Error Recovery:** Graceful handling of empty inputs, oversized payloads (>1MB), and corrupted model checksums.

---

## 2. Prerequisites & Environment Verification

### 2.1 Hardware Requirements
- **Host Machine:** Standard PC / Laptop running Windows 10/11 (or Linux / macOS).
- **CPU:** Dual-core 2.0 GHz or higher (Zero GPU required).
- **RAM:** Minimum 4 GB (8 GB recommended).
- **Disk Space:** Minimum 500 MB free space.

### 2.2 Software Dependencies
- **Python:** Python 3.12.x installed with virtual environment at `.venv`.
- **Node.js:** Node.js v18.0.0 or higher with npm 10+.
- **Browser:** Any modern web browser (Google Chrome, Microsoft Edge, or Mozilla Firefox).

### 2.3 Pre-Demonstration Integrity Check
Open PowerShell in the project directory (`e:\Sem 3\AI\mp\SpamGuard-AI-Handoff\AI_mp`) and verify the frozen model artifact checksum:
```powershell
.\.venv\Scripts\python.exe -c "import hashlib, pathlib; p = pathlib.Path('models/spam_pipeline.joblib'); print('Model SHA-256:', hashlib.sha256(p.read_bytes()).hexdigest())"
```
**Expected Output:**
```text
Model SHA-256: c652119c99f0db2abe0788969d002818478bb63be95e31e5f337eda8da6ddbb0
```
> **Critical Audit Rule:** The model SHA-256 checksum must match `c652119c...` exactly. The model must remain frozen.

---

## 3. Step-by-Step Setup & Launch Instructions (Windows)

To demonstrate the full multi-tier architecture, open three separate terminal windows in the project root directory.

### Terminal 1: Launch FastAPI Backend (Port 8000)
```powershell
# Navigate to project root
cd "e:\Sem 3\AI\mp\SpamGuard-AI-Handoff\AI_mp"

# Activate virtual environment and start Uvicorn
.\.venv\Scripts\Activate.ps1
uvicorn src.api:app --host 127.0.0.1 --port 8000 --reload
```
**Expected Terminal Output:**
```text
INFO:     Started server process [xxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### Terminal 2: Launch Next.js Modern Frontend (Port 3000)
```powershell
# Navigate to frontend directory
cd "e:\Sem 3\AI\mp\SpamGuard-AI-Handoff\AI_mp\frontend"

# Start Next.js development server
npm run dev
```
**Expected Terminal Output:**
```text
▲ Next.js 16.4.3 (Turbopack)
- Local:        http://localhost:3000
- Network:      http://[::]:3000
✓ Ready in 1.2s
```

### Terminal 3: Launch Streamlit Fallback Dashboard (Port 8501)
```powershell
# Navigate to project root
cd "e:\Sem 3\AI\mp\SpamGuard-AI-Handoff\AI_mp"

# Launch Streamlit fallback
.\.venv\Scripts\streamlit.exe run app.py --server.port 8501
```
**Expected Terminal Output:**
```text
You can now view your Streamlit app in your browser.
Local URL: http://localhost:8501
```

---

## 4. Live Demonstration Workflow

### Demo Phase 1: System Telemetry & Model Integrity Check (2 Minutes)
1. Open the browser and visit the FastAPI Health endpoint:
   `http://localhost:8000/api/health`
2. **Observe:** The API returns status `OPERATIONAL`, verifies the frozen model SHA-256 checksum in real-time, and identifies the model as `MultinomialNB(alpha=0.1) + TF-IDF(20,000 features)`.
3. Open the Next.js Workstation at `http://localhost:3000`:
   - Point out the Anthracite dark-mode theme, live connection pill, and system breadcrumb bar.
   - Point out that all data is loaded asynchronously from the FastAPI backend.

---

### Demo Phase 2: Single Email Threat Inspection (3 Minutes)
1. In the Next.js sidebar, click **Spam Detection** (or navigate to `http://localhost:3000/#detect`).

#### Demonstration A: Phishing / Financial Advance-Fee Spam
- **Subject:** `URGENT: Claim your $1,000,000 cash prize lottery winning immediately!`
- **Body:**
  ```text
  Dear Lucky Winner,
  
  Your email address was officially selected in our international lottery promotion. 
  To claim your guaranteed $1,000,000 bank wire transfer, click the link below and submit your banking account details and full identification.
  
  Failure to reply within 24 hours will forfeit your prize.
  ```
- **Action:** Click **"Scan Email"**.
- **Demonstrated Results:**
  - **Verdict:** Immediate Red **"Threat Detected: Spam / Phishing"** banner.
  - **Probabilities:** Estimated Spam Risk: $\approx 99.8\%$; Ham Probability: $\approx 0.2\%$.
  - **Latency:** Execution completed in $\approx 1.2$ ms.
  - **Explainability:** Feature contribution table highlights influential tokens:
    - `"prize"` ($\text{contribution} > 0$, Spam-leaning)
    - `"guaranteed"` ($\text{contribution} > 0$, Spam-leaning)
    - `"lottery"` ($\text{contribution} > 0$, Spam-leaning)

#### Demonstration B: Legitimate Academic / Technical Ham
- **Subject:** `SE IA3 Evaluation Schedule — Committee Review Agenda`
- **Body:**
  ```text
  Hello team,
  
  Please find attached the schedule and agenda for tomorrow's Software Engineering IA3 project evaluation. 
  Our session is scheduled for 10:30 AM in Lab 4. Please ensure all three terminals are active and the test suite has completed.
  
  Best regards,
  Project Coordinator
  ```
- **Action:** Click **"Scan Email"**.
- **Demonstrated Results:**
  - **Verdict:** Immediate Emerald Green **"Safe: Legitimate (Ham)"** shield.
  - **Probabilities:** Estimated Ham Confidence: $\approx 99.7\%$; Spam Probability: $\approx 0.3\%$.
  - **Explainability:** Feature attribution highlights genuine conversational tokens:
    - `"attached"` ($\text{contribution} < 0$, Ham-leaning)
    - `"schedule"` ($\text{contribution} < 0$, Ham-leaning)
    - `"agenda"` ($\text{contribution} < 0$, Ham-leaning)

---

### Demo Phase 3: Batch CSV Scanning & Formula Injection Defense (3 Minutes)
1. In the Next.js sidebar, click **Batch Scanner** (`http://localhost:3000/#batch`).
2. Upload a sample batch CSV file (or use a test file containing 10 rows).
3. **Demonstrate Formula Injection Defense:**
   - Include a row with an active formula payload:
     `subject`: `=SUM(A1:A10)` | `body`: `+cmd|' /C calc'!A0`
4. Click **"Scan Entire Batch"**.
5. **Observe Results:**
   - Vectorized inference completes instantaneously ($\approx 5$ ms for the entire batch).
   - Summary cards display Total Scanned, Spam Count, Ham Count, and Spam Percentage.
   - Filter results dynamically using the filter tabs: **"All"**, **"Spam Only"**, **"Ham Only"**.
6. Click **"Export Clean Results (CSV)"**.
7. Open the downloaded CSV in Notepad or Excel:
   - **Point out the security mitigation:** The formula cell `=SUM(A1:A10)` has been automatically neutralized to `'=SUM(A1:A10)` by `sanitize_csv_cell()`, preventing command execution.

---

### Demo Phase 4: Model Performance Analytics & Academic Disclosures (2 Minutes)
1. In the sidebar, click **Model Analytics** (`http://localhost:3000/#analytics`).
2. Present the authentic held-out test evaluation figures to the review panel:
   - **Evaluated Test Partition:** $n = 889$ untouched authentic emails.
   - **Overall Accuracy:** **$97.30\%$**
   - **Spam Precision:** **$97.33\%$**
   - **Spam Recall:** **$93.75\%$**
   - **Spam F1-Score:** **$95.51\%$**
   - **ROC-AUC:** **$0.9965$**
   - **False Positive Rate:** **$1.13\%$** ($7$ False Positives out of $617$ legitimate emails).
3. Point out the **Confusion Matrix Heatmap**:
   - True Negatives ($\text{TN}$): **$610$**
   - False Positives ($\text{FP}$): **$7$**
   - False Negatives ($\text{FN}$): **$17$**
   - True Positives ($\text{TP}$): **$255$**
4. Contrast against the **Zero-Intelligence Majority Baseline** ($69.40\%$ accuracy, $0.0\%$ Spam precision), proving substantial statistical lift.

---

### Demo Phase 5: Defensive Error Handling & Input Boundaries (2 Minutes)
1. Return to the Single Email Scanner.
2. **Test 1 — Empty Input:** Clear both fields and click **"Scan Email"**.
   - **Observed Behavior:** UI displays alert banner: *"Email content is empty or contains only whitespace after cleaning."* The backend returns HTTP 422 with zero stack trace leakage.
3. **Test 2 — Streamlit Fallback:** Open `http://localhost:8501`.
   - Point out that even if Next.js or FastAPI are taken offline, the Streamlit app provides full operational redundancy directly in Python.

---

## 5. Automated Test Suite Execution (Live Verification)

To prove comprehensive software quality assurance to the committee, run the automated test suites live from the project root.

### Run Python Pytest Suite (152 Tests)
```powershell
.\.venv\Scripts\python.exe -m pytest -v
```
**Verified Outcome:** **152 passed in $\approx 10.92$ seconds**.

### Run Node.js Frontend Contract Suite (5 Tests)
```powershell
npm test --prefix frontend
```
**Verified Outcome:** **5 passed in $\approx 0.07$ seconds**.

**Combined Total:** **157 / 157 passing automated tests (100.0% success rate)**.

---

## 6. Shutdown Instructions

To gracefully stop all running services:
1. In Terminal 1 (FastAPI): Press `Ctrl + C`.
2. In Terminal 2 (Next.js): Press `Ctrl + C`.
3. In Terminal 3 (Streamlit): Press `Ctrl + C`.
4. Close all terminal windows. No background daemons or orphaned processes remain.

---

## 7. Known Limitations & Academic Disclosures

1. **Temporal Horizon of Corpus:** The model is trained on the authentic Apache SpamAssassin Public Corpus (2003-2005). While fundamental spam vocabulary (prizes, pharmaceuticals, urgency, banking) remains highly consistent, zero-day modern spear-phishing payloads referencing contemporary brand logins (e.g., modern Okta, Microsoft 365 OAuth consent grants) may require future retraining.
2. **Text-Only Ingestion:** The current pipeline extracts and evaluates textual MIME payloads and HTML body text. It does not inspect embedded executable binary files (e.g., `.exe`, `.macro-enabled docx`) or QR code images inside attachments.
3. **Stateless Ephemeral Operation:** By design, SpamGuard AI enforces a zero-storage privacy policy. Classification results are not stored in a persistent database, requiring users to export batch CSV results before navigating away.

