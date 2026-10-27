"use client";

import React from "react";
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Calendar,
  User,
  Info,
  ExternalLink,
  Tag,
  Clock,
  Layers,
} from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";

export default function MessageDetailDrawer() {
  const { inspectItem, setInspectItem } = useWorkspace();

  if (!inspectItem) return null;

  const isSpam = inspectItem.review_status === "Spam";
  const isHam = inspectItem.review_status === "Ham";
  const isReview = inspectItem.review_status === "Needs Review";

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex justify-end transition-opacity"
      onClick={() => setInspectItem(null)}
    >
      <div
        className="w-full max-w-xl bg-[#141418] border-l border-white/[0.1] h-full shadow-2xl flex flex-col justify-between overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Drawer Top Header */}
          <div className="p-6 border-b border-white/[0.08] flex items-center justify-between sticky top-0 bg-[#141418]/95 backdrop-blur z-10">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                  isSpam
                    ? "bg-[#FF5D66]/20 text-[#FF5D66] border-[#FF5D66]/40"
                    : isHam
                    ? "bg-[#54D6A0]/20 text-[#54D6A0] border-[#54D6A0]/40"
                    : "bg-[#FFB020]/20 text-[#FFB020] border-[#FFB020]/40"
                }`}
              >
                {inspectItem.review_status}
              </span>
              <span className="text-xs font-mono text-[#66666E]">
                ID: {inspectItem.id}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setInspectItem(null)}
              className="p-1.5 rounded-lg text-[#66666E] hover:text-[#F4F3F0] hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Subject and Metadata */}
            <div>
              <h2 className="text-xl font-bold text-[#F4F3F0] tracking-tight">
                {inspectItem.subject}
              </h2>

              <div className="mt-3 space-y-1.5 font-mono text-xs text-[#A3A3A8]">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-[#66666E]" />
                  <span className="text-[#66666E]">Sender:</span>
                  <span className="text-[#F4F3F0] select-all">{inspectItem.sender}</span>
                </div>
                {inspectItem.date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#66666E]" />
                    <span className="text-[#66666E]">Received:</span>
                    <span>{inspectItem.date}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#66666E]" />
                  <span className="text-[#66666E]">Inference Latency:</span>
                  <span>{inspectItem.processing_time_ms} ms</span>
                </div>
              </div>
            </div>

            {/* Model Confidence Breakdown */}
            <div className="p-4 rounded-xl bg-[#0B0B0D] border border-white/[0.08] space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#A3A3A8] block">
                Model Classification Estimates
              </span>

              <div className="grid grid-cols-2 gap-4 font-mono">
                <div>
                  <span className="text-[11px] text-[#A3A3A8] block">Spam Probability</span>
                  <span className="text-2xl font-bold text-[#FF5D66]">
                    {(inspectItem.spam_probability * 100).toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#A3A3A8] block">Ham Probability</span>
                  <span className="text-2xl font-bold text-[#54D6A0]">
                    {(inspectItem.ham_probability * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Confidence Progress Bar */}
              <div className="h-2 w-full bg-[#141418] rounded-full overflow-hidden flex border border-white/[0.08]">
                <div
                  className="bg-[#FF5D66] h-full transition-all"
                  style={{ width: `${inspectItem.spam_probability * 100}%` }}
                />
                <div
                  className="bg-[#54D6A0] h-full transition-all"
                  style={{ width: `${inspectItem.ham_probability * 100}%` }}
                />
              </div>

              <div className="text-[10px] font-mono text-[#66666E]">
                Classification boundaries: Ham &le; 35% &lt; Needs Review &lt; 65% &le; Spam
              </div>
            </div>

            {/* Lexical Feature Explainability */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#A3A3A8] block mb-2">
                Key Lexical Features (TF-IDF Log-Odds)
              </span>

              {inspectItem.top_features && inspectItem.top_features.length > 0 ? (
                <div className="space-y-2">
                  {inspectItem.top_features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[#0B0B0D] border border-white/[0.06] flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="w-3 h-3 text-[#66666E]" />
                        <span className="font-bold text-[#F4F3F0]">&ldquo;{feat.token}&rdquo;</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded ${
                            feat.association === "Spam-leaning"
                              ? "bg-[#FF5D66]/20 text-[#FF5D66]"
                              : "bg-[#54D6A0]/20 text-[#54D6A0]"
                          }`}
                        >
                          {feat.association}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A3A3A8]">
                        Log-Odds: <span className="text-[#F4F3F0]">{feat.log_odds_diff > 0 ? `+${feat.log_odds_diff}` : feat.log_odds_diff}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#66666E] font-mono">
                  No dominant discriminative tokens recorded for this message.
                </p>
              )}
            </div>

            {/* Sanitized Message Body Preview (Untrusted Content Defense) */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#A3A3A8] block mb-2">
                Sanitized Plain Text Content (Read-Only)
              </span>
              <div className="p-4 rounded-xl bg-[#0B0B0D] border border-white/[0.08] text-xs font-mono text-[#A3A3A8] whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed select-text">
                {inspectItem.body_preview || inspectItem.snippet || "(No readable body extracted)"}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-mono text-[#66666E]">
                <Lock className="w-3 h-3 text-[#54D6A0]" />
                <span>Rendered as pure text. Script execution and tracking pixels neutralized.</span>
              </div>
            </div>

            {/* Explicit Lexical Safety Warning */}
            <div className="p-4 rounded-xl bg-[#FFB020]/10 border border-[#FFB020]/30 text-[#FFB020] text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Lexical Safety Warning</span>
              </div>
              <p className="font-mono text-[11px] leading-relaxed text-[#FFB020]/90">
                {inspectItem.warning_advisory}
              </p>
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-6 border-t border-white/[0.08] bg-[#0E0E12] flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#66666E]">
            Read-only mode • No emails are moved or altered
          </span>
          <button
            type="button"
            onClick={() => setInspectItem(null)}
            className="px-4 py-2 rounded-xl bg-[#1A1A20] hover:bg-white/[0.08] text-xs font-mono text-[#F4F3F0] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
