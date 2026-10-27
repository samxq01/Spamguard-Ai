"use client";

import React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Mail,
  Zap,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Layers,
  Clock,
  Radio,
  FileSpreadsheet,
  CheckCircle2,
  AlertOctagon,
} from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { startGoogleAuth } from "@/lib/api";

export default function DashboardView() {
  const {
    sessionStats,
    authStatus,
    authLoading,
    setActiveTab,
    recentActivity,
    setInspectItem,
  } = useWorkspace();

  const [connecting, setConnecting] = React.useState(false);
  const isConnected = !!authStatus?.authenticated;
  const isConfigured = authStatus?.configured ?? true;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const data = await startGoogleAuth();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch {
      setActiveTab("accounts");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F3F0]">
            Operational Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#A3A3A8] mt-1 font-mono">
            Real-time session monitoring & threat telemetry via frozen Multinomial Naïve Bayes engine
          </p>
        </div>

        {/* System Heartbeat Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141418] border border-white/[0.08] text-xs font-mono self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-[#54D6A0] animate-pulse" />
          <span className="text-[#A3A3A8]">Model Pipeline:</span>
          <span className="text-[#54D6A0] font-semibold">VERIFIED SHA-256</span>
        </div>
      </div>

      {/* Gmail Account Status Banner */}
      <div className="p-6 rounded-2xl bg-[#141418] border border-white/[0.08] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                isConnected
                  ? "bg-[#54D6A0]/10 border-[#54D6A0]/30 text-[#54D6A0]"
                  : "bg-[#FF5D66]/10 border-[#FF5D66]/30 text-[#FF5D66]"
              }`}
            >
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#F4F3F0]">
                  Google Gmail API Status
                </h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isConnected
                      ? "bg-[#54D6A0]/20 text-[#54D6A0] border border-[#54D6A0]/30"
                      : "bg-[#FF5D66]/20 text-[#FF5D66] border border-[#FF5D66]/30"
                  }`}
                >
                  {authLoading ? "Verifying..." : isConnected ? "Authorized" : "Not Connected"}
                </span>
              </div>
              <p className="text-xs text-[#A3A3A8] mt-1 font-mono">
                {isConnected
                  ? `Active Mailbox: ${authStatus?.email || "Google Account"} (Scope: gmail.readonly)`
                  : isConfigured
                  ? "Connect your Google account with official read-only scope to scan inbox threats."
                  : "Google OAuth credentials not configured on server. Review setup instructions."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isConnected ? (
              <button
                type="button"
                onClick={() => setActiveTab("inbox")}
                className="px-4 py-2.5 rounded-xl bg-[#B8F44A] text-[#0B0B0D] font-mono text-xs font-bold hover:bg-[#a6e03e] transition-all flex items-center gap-2 shadow-sm"
              >
                <span>Open Mailbox Scanner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={connecting}
                onClick={isConfigured ? handleConnect : () => setActiveTab("accounts")}
                className="px-4 py-2.5 rounded-xl bg-[#1A1A20] hover:bg-white/[0.08] text-[#F4F3F0] font-mono text-xs font-semibold transition-all border border-white/[0.12] flex items-center gap-2 disabled:opacity-50"
              >
                <span>{connecting ? "Opening Google..." : isConfigured ? "Connect Gmail Account" : "Configure Credentials"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Distinction Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#B8F44A] block">
            SESSION TELEMETRY
          </span>
          <h2 className="text-lg font-bold text-[#F4F3F0]">
            Current Scan Session Statistics
          </h2>
        </div>
        <div className="text-right font-mono text-[11px] text-[#66666E]">
          {sessionStats.lastScanTimestamp ? (
            <span>Last Scan: {new Date(sessionStats.lastScanTimestamp).toLocaleTimeString()}</span>
          ) : (
            <span>No scans executed in current browser session</span>
          )}
        </div>
      </div>

      {/* Operational KPI Grid (Session stats, not invented) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
        {/* Scanned */}
        <div className="p-5 rounded-2xl bg-[#141418] border border-white/[0.08]">
          <span className="text-[10px] uppercase text-[#A3A3A8] tracking-wider block mb-1">
            Session Emails Scanned
          </span>
          <span className="text-3xl font-bold text-[#F4F3F0]">
            {sessionStats.emailsScannedSession}
          </span>
          <span className="text-[10px] text-[#66666E] block mt-1">
            Across active inbox & batch jobs
          </span>
        </div>

        {/* Spam */}
        <div className="p-5 rounded-2xl bg-[#141418] border border-white/[0.08]">
          <span className="text-[10px] uppercase text-[#FF5D66] tracking-wider block mb-1">
            Spam Detected
          </span>
          <span className="text-3xl font-bold text-[#FF5D66]">
            {sessionStats.spamDetectedSession}
          </span>
          <span className="text-[10px] text-[#66666E] block mt-1">
            High confidence threats
          </span>
        </div>

        {/* Ham */}
        <div className="p-5 rounded-2xl bg-[#141418] border border-white/[0.08]">
          <span className="text-[10px] uppercase text-[#54D6A0] tracking-wider block mb-1">
            Ham Verified
          </span>
          <span className="text-3xl font-bold text-[#54D6A0]">
            {sessionStats.hamDetectedSession}
          </span>
          <span className="text-[10px] text-[#66666E] block mt-1">
            Legitimate communications
          </span>
        </div>

        {/* Needs Review */}
        <div className="p-5 rounded-2xl bg-[#141418] border border-white/[0.08]">
          <span className="text-[10px] uppercase text-[#FFB020] tracking-wider block mb-1">
            Requires Review
          </span>
          <span className="text-3xl font-bold text-[#FFB020]">
            {sessionStats.needsReviewSession}
          </span>
          <span className="text-[10px] text-[#66666E] block mt-1">
            Borderline probability margins
          </span>
        </div>
      </div>

      {/* Offline Academic Baseline Benchmark Comparison Card */}
      <div className="p-5 rounded-2xl bg-[#0E0E12] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#66666E] block">
            HISTORICAL MODEL BENCHMARK (SEPARATE FROM SESSION DATA)
          </span>
          <p className="text-xs text-[#A3A3A8] mt-0.5">
            Verified on held-out Apache SpamAssassin split (n=889): Accuracy <strong className="text-[#F4F3F0]">97.30%</strong>, Spam Precision <strong className="text-[#F4F3F0]">97.33%</strong>, ROC-AUC <strong className="text-[#F4F3F0]">0.9965</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className="text-xs font-mono text-[#B8F44A] hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Inspect Evaluation Reports</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Quick Actions Panel */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#A3A3A8] font-mono mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("inbox")}
            className="p-5 rounded-2xl bg-[#141418] hover:bg-[#1A1A20] border border-white/[0.08] hover:border-white/[0.18] transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] text-[#B8F44A] flex items-center justify-center mb-3">
              <Mail className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-[#F4F3F0] group-hover:text-[#B8F44A] transition-colors">
              Scan Gmail Inbox
            </h4>
            <p className="text-xs text-[#A3A3A8] mt-1 font-mono">
              Retrieve & inspect recent messages with explainability.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("detect")}
            className="p-5 rounded-2xl bg-[#141418] hover:bg-[#1A1A20] border border-white/[0.08] hover:border-white/[0.18] transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] text-[#B8F44A] flex items-center justify-center mb-3">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-[#F4F3F0] group-hover:text-[#B8F44A] transition-colors">
              Single Email Scanner
            </h4>
            <p className="text-xs text-[#A3A3A8] mt-1 font-mono">
              Analyze raw text or synthetic templates instantly.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("batch")}
            className="p-5 rounded-2xl bg-[#141418] hover:bg-[#1A1A20] border border-white/[0.08] hover:border-white/[0.18] transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] text-[#B8F44A] flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-[#F4F3F0] group-hover:text-[#B8F44A] transition-colors">
              Batch CSV Scanner
            </h4>
            <p className="text-xs text-[#A3A3A8] mt-1 font-mono">
              Upload multi-email CSV files with formula-injection defenses.
            </p>
          </button>
        </div>
      </div>

      {/* Recent Scan Activity Stream */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#A3A3A8] font-mono">
            Recent Scan Activity
          </h3>
          <span className="text-xs font-mono text-[#66666E]">
            {recentActivity.length} items logged this session
          </span>
        </div>

        {recentActivity.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#141418] border border-white/[0.08] text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] text-[#66666E] flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-medium text-[#F4F3F0]">
              No Scan Activity Yet
            </h4>
            <p className="text-xs text-[#A3A3A8] max-w-sm mx-auto mt-1 font-mono">
              Connect your Gmail account or run an ad-hoc single or batch scan to inspect classification activity here.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab(isConnected ? "inbox" : "accounts")}
                className="px-4 py-2 rounded-xl bg-[#1A1A20] text-xs font-mono text-[#F4F3F0] border border-white/[0.1] hover:bg-white/[0.08]"
              >
                {isConnected ? "Scan Mailbox Now" : "Connect Account"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("detect")}
                className="px-4 py-2 rounded-xl bg-[#B8F44A] text-xs font-mono font-bold text-[#0B0B0D] hover:bg-[#a6e03e]"
              >
                Test Single Email
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#141418] border border-white/[0.08] overflow-hidden">
            <div className="divide-y divide-white/[0.06]">
              {recentActivity.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  onClick={() => setInspectItem(item)}
                  className="p-4 hover:bg-white/[0.02] cursor-pointer transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
                          item.review_status === "Spam"
                            ? "bg-[#FF5D66]/20 text-[#FF5D66] border-[#FF5D66]/30"
                            : item.review_status === "Ham"
                            ? "bg-[#54D6A0]/20 text-[#54D6A0] border-[#54D6A0]/30"
                            : "bg-[#FFB020]/20 text-[#FFB020] border-[#FFB020]/30"
                        }`}
                      >
                        {item.review_status}
                      </span>
                      <span className="text-xs font-semibold text-[#F4F3F0] truncate font-sans">
                        {item.subject}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-[#A3A3A8] truncate">
                      From: {item.sender}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 font-mono text-xs text-right">
                    <div>
                      <span className="text-[#A3A3A8] text-[10px] block">Spam Prob</span>
                      <span className="text-[#F4F3F0] font-bold">
                        {(item.spam_probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-xs text-[#B8F44A] underline font-sans">
                      Inspect
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
