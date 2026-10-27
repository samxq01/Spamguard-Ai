/**
 * SpamGuard AI — Client API SDK
 * Connects frontend directly to the thin FastAPI backend with typed error handling and fallback support.
 */

export interface FeatureContribution {
  token: string;
  weight: number;
  log_odds_diff: number;
  contribution: number;
  association: "Spam-leaning" | "Ham-leaning" | string;
}

export interface PredictionResponse {
  predicted_class: 0 | 1;
  predicted_label: "Ham" | "Spam";
  is_spam: boolean;
  spam_probability: number;
  ham_probability: number;
  processing_time_ms: number;
  cleaned_char_count: number;
  model_identifier: string;
  top_features: FeatureContribution[];
}

export interface BatchItemResult {
  id?: string;
  subject: string;
  body_preview: string;
  predicted_class: number;
  predicted_label: "Ham" | "Spam";
  is_spam: boolean;
  spam_probability: number;
  ham_probability: number;
  processing_time_ms: number;
  top_features: FeatureContribution[];
}

export interface BatchResponse {
  total_count: number;
  spam_count: number;
  ham_count: number;
  spam_percentage: number;
  ham_percentage: number;
  total_duration_ms: number;
  avg_latency_ms: number;
  items: BatchItemResult[];
}

export interface SystemHealth {
  status: "OPERATIONAL" | "DEGRADED" | "UNAVAILABLE";
  model_available: boolean;
  model_sha256: string;
  model_sha256_verified: boolean;
  model_identifier: string;
  system_info: {
    os: string;
    python: string;
  };
}

export interface SyntheticSample {
  key: string;
  title: string;
  category: "Spam" | "Ham";
  subject: string;
  body: string;
  description: string;
}

export interface EvaluationMetricsData {
  evaluation: {
    metadata: {
      project_name: string;
      model_type: string;
      model_artifact_sha256: string;
      test_split_sha256: string;
      test_sample_count: number;
    };
    final_test_metrics: {
      accuracy: number;
      balanced_accuracy: number;
      specificity: number;
      false_positive_rate: number;
      false_negative_rate: number;
      spam: {
        precision: number;
        recall: number;
        f1_score: number;
        support: number;
      };
      ham: {
        precision: number;
        recall: number;
        f1_score: number;
        support: number;
      };
      roc_auc: number;
      average_precision: number;
      confusion_matrix: {
        tn: number;
        fp: number;
        fn: number;
        tp: number;
        matrix: number[][];
      };
      total_samples: number;
    };
    majority_class_baseline: {
      accuracy: number;
      roc_auc: number;
      spam: {
        f1_score: number;
      };
      confusion_matrix: {
        tn: number;
        fp: number;
        fn: number;
        tp: number;
      };
    };
  };
  course_metadata: {
    title: string;
    course: string;
    competencies: Array<{
      code: string;
      title: string;
      description: string;
    }>;
    team_roles: Array<{
      name: string;
      role: string;
      responsibility: string;
    }>;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function fetchHealth(): Promise<SystemHealth> {
  const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Health check failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function classifyEmail(
  subject: string,
  body: string,
  explain = true,
  top_k = 10
): Promise<PredictionResponse> {
  const res = await fetch(`${API_BASE}/api/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, body, explain, top_k }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Inference failed" }));
    throw new Error(err.detail || `Classification error: ${res.status}`);
  }
  return res.json();
}

export async function classifyBatchJson(
  emails: Array<{ id?: string; subject: string; body: string }>,
  explain = false
): Promise<BatchResponse> {
  const res = await fetch(`${API_BASE}/api/predict/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails, explain }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Batch inference failed" }));
    throw new Error(err.detail || `Batch error: ${res.status}`);
  }
  return res.json();
}

export async function classifyBatchCsv(
  file: File,
  explain = false
): Promise<BatchResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/predict/csv?explain=${explain}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "CSV upload failed" }));
    throw new Error(err.detail || `CSV error: ${res.status}`);
  }
  return res.json();
}

export async function fetchMetrics(): Promise<EvaluationMetricsData> {
  const res = await fetch(`${API_BASE}/api/metrics`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Metrics error: ${res.status}`);
  }
  return res.json();
}

export async function fetchSamples(): Promise<{ samples: SyntheticSample[] }> {
  const res = await fetch(`${API_BASE}/api/samples`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Samples error: ${res.status}`);
  }
  return res.json();
}

// =====================================================================
// Gmail & OAuth Types & API Methods
// =====================================================================

export interface GmailAuthStatus {
  authenticated: boolean;
  configured: boolean;
  email?: string;
  name?: string;
  picture?: string;
  connected_at?: number;
  scopes?: string[];
  setup_instructions?: {
    title: string;
    steps: string[];
    redirect_uri: string;
    required_scopes: string[];
  };
}

export interface GmailMessageItem {
  id: string;
  thread_id: string;
  sender: string;
  recipient: string;
  subject: string;
  date: string;
  snippet: string;
  body_preview: string;
  has_html: boolean;
  has_attachments: boolean;
}

export interface GmailListResponse {
  total_found: number;
  next_page_token?: string;
  messages: GmailMessageItem[];
}

export interface ScannedEmailItem {
  id: string;
  thread_id: string;
  sender: string;
  recipient: string;
  subject: string;
  date: string;
  snippet: string;
  body_preview: string;
  predicted_class: number;
  predicted_label: string;
  is_spam: boolean;
  spam_probability: number;
  ham_probability: number;
  review_status: "Spam" | "Ham" | "Needs Review";
  confidence_level: string;
  needs_review: boolean;
  processing_time_ms: number;
  top_features: FeatureContribution[];
  warning_advisory: string;
  has_html: boolean;
  has_attachments: boolean;
}

export interface GmailScanResponse {
  total_scanned: number;
  spam_count: number;
  ham_count: number;
  review_count: number;
  spam_percentage: number;
  ham_percentage: number;
  review_percentage: number;
  scan_timestamp: string;
  duration_ms: number;
  items: ScannedEmailItem[];
}

export interface SettingsData {
  threshold_low: number;
  threshold_high: number;
  updated_at?: string;
}

export async function fetchAuthStatus(): Promise<GmailAuthStatus> {
  const res = await fetch(`${API_BASE}/api/auth/status`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Auth status error: HTTP ${res.status}`);
  }
  return res.json();
}

export async function startGoogleAuth(): Promise<{ authorization_url: string; state: string }> {
  const res = await fetch(`${API_BASE}/api/auth/google/start`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "OAuth initialization failed" }));
    throw new Error(err.detail || `OAuth error: HTTP ${res.status}`);
  }
  return res.json();
}

export async function disconnectGmail(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/disconnect`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Disconnect error: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchGmailMessages(
  query = "",
  max_results = 20,
  page_token?: string
): Promise<GmailListResponse> {
  const params = new URLSearchParams({
    query,
    max_results: String(max_results),
  });
  if (page_token) params.set("page_token", page_token);

  const res = await fetch(`${API_BASE}/api/gmail/messages?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to list Gmail messages" }));
    throw new Error(err.detail || `Gmail list error: HTTP ${res.status}`);
  }
  return res.json();
}

export async function scanRecentGmail(
  max_messages = 15,
  query = "",
  explain = true,
  top_k = 5
): Promise<GmailScanResponse> {
  const res = await fetch(`${API_BASE}/api/gmail/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ max_messages, query, explain, top_k }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Gmail scan failed" }));
    throw new Error(err.detail || `Gmail scan error: HTTP ${res.status}`);
  }
  return res.json();
}

export async function scanSelectedGmail(
  message_ids: string[],
  explain = true,
  top_k = 5
): Promise<GmailScanResponse> {
  const res = await fetch(`${API_BASE}/api/gmail/scan-selected`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message_ids, explain, top_k }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Selected scan failed" }));
    throw new Error(err.detail || `Scan error: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSettings(): Promise<SettingsData> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Settings fetch error: HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateSettings(
  threshold_low: number,
  threshold_high: number
): Promise<SettingsData> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ threshold_low, threshold_high }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Settings update failed" }));
    throw new Error(err.detail || `Settings update error: HTTP ${res.status}`);
  }
  return res.json();
}
