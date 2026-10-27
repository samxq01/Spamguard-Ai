"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Filter,
  CheckSquare,
  Square,
  ChevronRight,
  ExternalLink,
  Lock,
  Layers,
  ArrowUpDown,
  X,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import {
  fetchGmailMessages,
  scanRecentGmail,
  scanSelectedGmail,
  GmailMessageItem,
  ScannedEmailItem,
} from "@/lib/api";

export default function GmailInboxView() {
  const {
    authStatus,
    authLoading,
    recordScan,
    setActiveTab,
    setInspectItem,
  } = useWorkspace();

  const isConnected = !!authStatus?.authenticated;
  const isConfigured = authStatus?.configured ?? true;

  // Scanning options
  const [batchCount, setBatchCount] = useState<number>(15);
  const [searchQuery, setSearchQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Scanned results
  const [scannedItems, setScannedItems] = useState<ScannedEmailItem[]>([]);
  const [filter, setFilter] = useState<"all" | "spam" | "ham" | "review">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Handle Scan Recent Inbox
  const handleScanRecent = async () => {
    if (!isConnected) return;
    setScanning(true);
    setScanError(null);
    try {
      const summary = await scanRecentGmail(batchCount, searchQuery, true, 5);
      setScannedItems(summary.items);
      recordScan(summary);
      setSelectedIds(new Set());
    } catch (err: any) {
      setScanError(err.message || "Failed to scan recent Gmail messages.");
    } finally {
      setScanning(false);
    }
  };

  // Handle Scan Selected Messages
  const handleScanSelected = async () => {
    if (!isConnected || selectedIds.size === 0) return;
    setScanning(true);
    setScanError(null);
    try {
      const idList = Array.from(selectedIds);
      const summary = await scanSelectedGmail(idList, true, 5);
      // Update existing items or prepend
      setScannedItems((prev) => {
        const idMap = new Map(summary.items.map((it) => [it.id, it]));
        const updated = prev.map((item) => idMap.get(item.id) || item);
        return updated;
      });
      recordScan(summary);
    } catch (err: any) {
      setScanError(err.message || "Failed to scan selected messages.");
    } finally {
      setScanning(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((it) => it.id)));
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter items
  const filteredItems = scannedItems.filter((item) => {
    if (filter === "spam" && item.review_status !== "Spam") return false;
    if (filter === "ham" && item.review_status !== "Ham") return false;
    if (filter === "review" && item.review_status !== "Needs Review") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubj = item.subject.toLowerCase().includes(q);
      const matchSender = item.sender.toLowerCase().includes(q);
      const matchSnippet = item.snippet.toLowerCase().includes(q);
      if (!matchSubj && !matchSender && !matchSnippet) return false;
    }
    return true;
  });

  // Calculate quick stats from current view
  const currentSpamCount = scannedItems.filter((i) => i.review_status === "Spam").length;
  const currentHamCount = scannedItems.filter((i) => i.review_status === "Ham").length;
  const currentReviewCount = scannedItems.filter((i) => i.review_status === "Needs Review").length;

  if (authLoading) {
    return (
      <div className="p-16 text-center text-[#A3A3A8] font-mono text-sm">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-[#B8F44A]" />
        Checking Google authentication status...
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="p-8 sm:p-12 rounded-3xl bg-[#141418] border border-white/[0.08] text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1A1A20] text-[#B8F44A] border border-white/[0.1] flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#F4F3F0]">
            Connect Google Gmail
          </h2>
          <p className="text-xs sm:text-sm text-[#A3A3A8] max-w-lg mx-auto mt-2 font-mono">
            SpamGuard AI connects via Google's official OAuth 2.0 API with strictly minimal read-only permissions (
            <code className="text-[#B8F44A]">gmail.readonly</code>).
          </p>

          <div className="my-6 p-4 rounded-xl bg-[#0B0B0D] border border-white/[0.06] text-left text-xs font-mono space-y-1.5 max-w-md mx-auto text-[#A3A3A8]">
            <div className="flex items-center gap-2 text-[#54D6A0]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Read-only: Never modifies, deletes, or moves emails</span>
            </div>
            <div className="flex items-center gap-2 text-[#54D6A0]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>On-demand: Only accesses messages when you initiate a scan</span>
            </div>
            <div className="flex items-center gap-2 text-[#54D6A0]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Private: Local ML classification without external LLMs</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("accounts")}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#B8F44A] text-[#0B0B0D] font-mono text-xs font-bold hover:bg-[#a6e03e] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{isConfigured ? "Connect Account" : "Open Setup Guide"}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("detect")}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1A1A20] text-[#A3A3A8] hover:text-[#F4F3F0] font-mono text-xs hover:bg-white/[0.08] transition-all border border-white/[0.08]"
            >
              Try Single Email Scanner
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F4F3F0]">
            Gmail Inbox Threat Scanner
          </h1>
          <p className="text-xs text-[#A3A3A8] font-mono mt-0.5">
            Connected: <span className="text-[#54D6A0] font-semibold">{authStatus.email}</span> (Scope: gmail.readonly)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("accounts")}
            className="px-3 py-1.5 rounded-lg bg-[#141418] border border-white/[0.08] hover:bg-white/[0.06] text-xs font-mono text-[#A3A3A8] hover:text-[#F4F3F0] transition-colors"
          >
            Manage Connection
          </button>
        </div>
      </div>

      {/* Scanner Control Toolbar */}
      <div className="p-4 rounded-2xl bg-[#141418] border border-white/[0.08] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#66666E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter subject, sender, or query (e.g. invoice, urgent)..."
            className="w-full bg-[#0B0B0D] border border-white/[0.08] focus:border-[#B8F44A]/60 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-[#F4F3F0] placeholder:text-[#66666E] focus:outline-none transition-colors"
          />
        </div>

        {/* Middle: Batch size selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-[#66666E]">Batch:</span>
          <select
            value={batchCount}
            onChange={(e) => setBatchCount(Number(e.target.value))}
            className="bg-[#0B0B0D] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs font-mono text-[#F4F3F0] focus:outline-none focus:border-[#B8F44A]/60"
          >
            <option value={10}>10 emails</option>
            <option value={15}>15 emails</option>
            <option value={25}>25 emails</option>
            <option value={50}>50 emails (max)</option>
          </select>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleScanRecent}
            disabled={scanning}
            className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-[#B8F44A] text-[#0B0B0D] font-mono text-xs font-bold hover:bg-[#a6e03e] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
            <span>{scanning ? "Scanning..." : "Scan Recent Inbox"}</span>
          </button>

          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleScanSelected}
              disabled={scanning}
              className="px-3.5 py-2 rounded-xl bg-[#1A1A20] text-[#F4F3F0] font-mono text-xs font-semibold hover:bg-white/[0.08] border border-white/[0.1] transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>Scan ({selectedIds.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {scanError && (
        <div className="p-4 rounded-xl bg-[#FF5D66]/10 border border-[#FF5D66]/30 text-[#FF5D66] text-xs font-mono flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong>Scan Error:</strong> {scanError}
          </div>
          <button type="button" onClick={() => setScanError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Results Filter Bar */}
      {scannedItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#141418] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filter === "all"
                  ? "bg-[#1A1A20] text-[#F4F3F0] font-bold"
                  : "text-[#66666E] hover:text-[#A3A3A8]"
              }`}
            >
              All ({scannedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("spam")}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                filter === "spam"
                  ? "bg-[#FF5D66]/20 text-[#FF5D66] font-bold border border-[#FF5D66]/30"
                  : "text-[#66666E] hover:text-[#FF5D66]"
              }`}
            >
              <span>Spam</span>
              <span className="font-bold">({currentSpamCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("ham")}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                filter === "ham"
                  ? "bg-[#54D6A0]/20 text-[#54D6A0] font-bold border border-[#54D6A0]/30"
                  : "text-[#66666E] hover:text-[#54D6A0]"
              }`}
            >
              <span>Ham</span>
              <span className="font-bold">({currentHamCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("review")}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                filter === "review"
                  ? "bg-[#FFB020]/20 text-[#FFB020] font-bold border border-[#FFB020]/30"
                  : "text-[#66666E] hover:text-[#FFB020]"
              }`}
            >
              <span>Needs Review</span>
              <span className="font-bold">({currentReviewCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[#66666E]">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:text-[#F4F3F0] hover:bg-white/[0.04] transition-colors"
            >
              {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-[#B8F44A]" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              <span>Select All</span>
            </button>
          </div>
        </div>
      )}

      {/* Message List Table */}
      {scannedItems.length === 0 ? (
        <div className="p-16 rounded-2xl bg-[#141418] border border-white/[0.08] text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] text-[#66666E] flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#F4F3F0]">
            Inbox Ready for Scan
          </h3>
          <p className="text-xs text-[#A3A3A8] max-w-sm mx-auto mt-1 font-mono">
            Click &ldquo;Scan Recent Inbox&rdquo; above to retrieve and classify recent messages using the verified model.
          </p>
          <button
            type="button"
            onClick={handleScanRecent}
            disabled={scanning}
            className="mt-5 px-5 py-2.5 rounded-xl bg-[#B8F44A] text-[#0B0B0D] font-mono text-xs font-bold hover:bg-[#a6e03e] transition-all inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
            <span>Scan 15 Most Recent Messages</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#141418] border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0E0E12] text-[10px] font-mono uppercase tracking-wider text-[#66666E]">
                  <th className="py-3 px-4 w-10">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-[#66666E] hover:text-[#F4F3F0]"
                    >
                      {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[#B8F44A]" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4 min-w-[180px]">Sender</th>
                  <th className="py-3 px-4 min-w-[260px]">Subject & Snippet</th>
                  <th className="py-3 px-4 min-w-[110px]">Received</th>
                  <th className="py-3 px-4 min-w-[120px]">Classification</th>
                  <th className="py-3 px-4 min-w-[120px]">Spam Probability</th>
                  <th className="py-3 px-4 text-right w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isSpam = item.review_status === "Spam";
                  const isHam = item.review_status === "Ham";
                  const isReview = item.review_status === "Needs Review";

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isSelected ? "bg-white/[0.03]" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectItem(item.id)}
                          className="text-[#66666E] hover:text-[#F4F3F0]"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-[#B8F44A]" />
                          ) : (
                            <Square className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>

                      {/* Sender */}
                      <td className="py-3 px-4 font-mono text-[11px] text-[#A3A3A8] truncate max-w-[200px]">
                        <span title={item.sender}>{item.sender}</span>
                      </td>

                      {/* Subject & Preview */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#F4F3F0] truncate max-w-[320px]">
                          {item.subject}
                        </div>
                        <div className="text-[11px] text-[#66666E] truncate max-w-[320px] font-mono mt-0.5">
                          {item.body_preview}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-[11px] text-[#66666E] whitespace-nowrap">
                        {item.date ? item.date.slice(0, 16) : "N/A"}
                      </td>

                      {/* Classification Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                            isSpam
                              ? "bg-[#FF5D66]/20 text-[#FF5D66] border-[#FF5D66]/40"
                              : isHam
                              ? "bg-[#54D6A0]/20 text-[#54D6A0] border-[#54D6A0]/40"
                              : "bg-[#FFB020]/20 text-[#FFB020] border-[#FFB020]/40"
                          }`}
                        >
                          {isSpam ? (
                            <ShieldAlert className="w-2.5 h-2.5" />
                          ) : isHam ? (
                            <ShieldCheck className="w-2.5 h-2.5" />
                          ) : (
                            <AlertTriangle className="w-2.5 h-2.5" />
                          )}
                          <span>{item.review_status}</span>
                        </span>
                      </td>

                      {/* Spam Probability Bar */}
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#0B0B0D] rounded-full overflow-hidden border border-white/[0.08]">
                            <div
                              className={`h-full rounded-full ${
                                isSpam
                                  ? "bg-[#FF5D66]"
                                  : isHam
                                  ? "bg-[#54D6A0]"
                                  : "bg-[#FFB020]"
                              }`}
                              style={{ width: `${Math.round(item.spam_probability * 100)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-[#F4F3F0] w-10 text-right">
                            {(item.spam_probability * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>

                      {/* Inspect Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setInspectItem(item)}
                          className="px-2.5 py-1 rounded-lg bg-[#1A1A20] hover:bg-white/[0.08] text-[11px] font-mono text-[#B8F44A] transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
