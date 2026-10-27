# SpamGuard AI — Google Gmail API Integration & Setup Guide

## 1. Overview & Architectural Security Invariants

SpamGuard AI integrates with Google Gmail via Google's official OAuth 2.0 authorization framework and REST API v1.

### Security Guarantees
- **Minimal Read-Only Scope**: The application requests only `https://www.googleapis.com/auth/gmail.readonly`, `openid`, `https://www.googleapis.com/auth/userinfo.email`, and `https://www.googleapis.com/auth/userinfo.profile`.
- **Negative Scope Invariant**: The application strictly **never** requests `gmail.modify` or `mail.google.com`.
- **Zero Mailbox Mutation**: The system contains zero code capable of moving, labeling, archiving, deleting, or sending emails.
- **Privacy-First Classification**: Email contents are classified locally through the frozen Scikit-learn pipeline (`models/spam_pipeline.joblib`). No email text is transmitted to external LLMs or third-party cloud AI vendors.
- **No Body Persistence**: Email bodies are processed in volatile memory on demand and are never stored in a persistent database.
- **Logging Hygiene**: Private email bodies, sender addresses, and OAuth tokens are strictly scrubbed and never written to application logs.

---

## 2. Step-by-Step Google Cloud Console Setup

### Step 1: Create a Google Cloud Project
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top of the page and select **New Project**.
3. Enter Project Name: `SpamGuard-AI` and click **Create**.

### Step 2: Enable the Gmail API
1. In the Google Cloud Console, open the left navigation menu and select **APIs & Services > Library**.
2. In the search box, type `Gmail API` and select the result.
3. Click **Enable**.

### Step 3: Configure the OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Select **User Type**: **External** and click **Create**.
3. Fill in the required application details:
   - **App name**: `SpamGuard AI`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Click **Save and Continue**.
5. On the **Scopes** step, click **Add or Remove Scopes**:
   - Manually add or check:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `openid`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
6. Click **Update** and then **Save and Continue**.

### Step 4: Add Test Users (Required for Development Status)
> [!IMPORTANT]
> Google keeps new OAuth applications in **Testing** status by default. In this mode, Google's authorization servers will reject logins with a `403 Access Blocked: app has not completed verification` error unless the specific Google account is listed in the Test Users table.

1. On the **Test users** step of the OAuth consent screen wizard, click **+ Add Users**.
2. Enter your Gmail address (and any tester Gmail addresses you intend to use).
3. Click **Add**, then **Save and Continue**, and click **Back to Dashboard**.

### Step 5: Create OAuth 2.0 Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. Under **Application type**, select **Web application**.
4. Enter Name: `SpamGuard AI Local Web Client`.
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
6. Under **Authorized redirect URIs**, add:
   - `http://localhost:8000/api/auth/google/callback`
   - `http://127.0.0.1:8000/api/auth/google/callback`
7. Click **Create**.
8. A modal will display your **Client ID** and **Client Secret**. Keep these secure.

---

## 3. Local Environment Configuration

1. In the project root, copy the `.env.example` template:
   ```bash
   cp .env.example .env
   ```
2. Populate the `.env` file with your credentials:
   ```env
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
   APP_SESSION_SECRET=create_a_random_32_character_string_here
   FRONTEND_URL=http://localhost:3000
   BACKEND_URL=http://127.0.0.1:8000
   ```

---

## 4. Running the Application

### 1. Launch the FastAPI Backend
From the workspace root:
```bash
.\.venv\Scripts\uvicorn src.api:app --host 127.0.0.1 --port 8000
```
API Documentation will be available at `http://127.0.0.1:8000/api/docs`.

### 2. Launch the Next.js Frontend
From the `frontend/` directory:
```bash
npm run dev
```
Open your browser to `http://localhost:3000`.

### 3. Connect Gmail
1. In the left sidebar, click **Connected Accounts** (or **Gmail Inbox**).
2. Click **Connect Gmail**.
3. Complete the Google OAuth consent screen.
4. You will be redirected back to the SpamGuard AI Inbox, with your connected account identity displayed.
5. Click **Scan Recent Inbox** to retrieve and classify messages in real time.

---

## 5. Token Revocation & Disconnect Behavior

To revoke access:
1. Navigate to **Connected Accounts** in the sidebar.
2. Click **Disconnect & Revoke**.
3. The backend calls Google's token revocation endpoint (`https://oauth2.googleapis.com/revoke?token=...`) and destroys the HttpOnly session cookie.

---

## 6. Verification Status & Production Notice
- Connecting via Google OAuth does not indicate that the application is operated, verified, or endorsed by Google LLC.
- For public production deployments outside configured test users, Google requires completing Google OAuth App Verification.
