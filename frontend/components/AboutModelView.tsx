"use client";

import React from "react";
import {
  Info,
  ShieldCheck,
  AlertTriangle,
  FileCode,
  Layers,
  Database,
  Lock,
  ExternalLink,
  BookOpen,
} from "lucide-react";

export default function AboutModelView() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-white/[0.08]">
        <h1 className="text-2xl font-bold tracking-tight text-[#F4F3F0]">
          About SpamGuard AI &amp; Model Methodology
        </h1>
        <p className="text-xs text-[#A3A3A8] font-mono mt-1">
          Academic foundation, feature engineering, verified evaluation metrics, and historical threat limitations
        </p>
      </div>

      {/* Model Specifications Card */}
      <div className="p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-5">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-[#B8F44A]" />
          <h2 className="text-base font-semibold text-[#F4F3F0]">
            Classification Pipeline Architecture
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-[#0B0B0D] border border-white/[0.06] space-y-2">
            <span className="text-[#B8F44A] font-bold block">Algorithm Selection (CO2)</span>
            <p className="text-[#A3A3A8] leading-relaxed">
              Multinomial Naïve Bayes (<code>MultinomialNB</code>) with Lidstone additive smoothing (<code>&alpha; = 0.1</code>). Chosen for exceptional sample efficiency and discrete token log-odds explainability on high-dimensional text data.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0B0B0D] border border-white/[0.06] space-y-2">
            <span className="text-[#B8F44A] font-bold block">Feature Extraction (CO4)</span>
            <p className="text-[#A3A3A8] leading-relaxed">
              TF-IDF (Term Frequency-Inverse Document Frequency) with unigram and bigram ranges (<code>ngram_range=(1, 2)</code>), <code>min_df=2</code>, and <code>max_df=0.98</code>. Fitted strictly on the training partition to eliminate leakage.
            </p>
          </div>
        </div>

        {/* SHA-256 Verification */}
        <div className="p-4 rounded-xl bg-[#0B0B0D] border border-white/[0.06] font-mono text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-[#54D6A0] font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>Cryptographic Pipeline Checksum</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#141418] text-[#F4F3F0] text-[11px] select-all break-all border border-white/[0.08]">
            c652119c99f0db2abe0788969d002818478bb63be95e31e5f337eda8da6ddbb0
          </div>
          <p className="text-[10px] text-[#66666E]">
            Model weights in <code>models/spam_pipeline.joblib</code> are frozen and validated at startup. Zero retraining at inference.
          </p>
        </div>
      </div>

      {/* Verified Academic Evaluation Metrics Card */}
      <div className="p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#54D6A0]" />
            <h2 className="text-base font-semibold text-[#F4F3F0]">
              Verified Held-Out Test Evaluation (n=889)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-[#54D6A0] px-2 py-0.5 rounded bg-[#54D6A0]/10 border border-[#54D6A0]/30">
            Phase 06 Certification
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-[#0B0B0D] border border-white/[0.06]">
            <span className="text-[#66666E] uppercase block mb-1">Accuracy</span>
            <span className="text-2xl font-bold text-[#F4F3F0]">97.30%</span>
            <span className="text-[10px] text-[#A3A3A8] block mt-0.5">865/889 test</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0B0D] border border-white/[0.06]">
            <span className="text-[#66666E] uppercase block mb-1">Spam Precision</span>
            <span className="text-2xl font-bold text-[#F4F3F0]">97.33%</span>
            <span className="text-[10px] text-[#A3A3A8] block mt-0.5">255 TP / 262 Flagged</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0B0D] border border-white/[0.06]">
            <span className="text-[#66666E] uppercase block mb-1">Spam Recall</span>
            <span className="text-2xl font-bold text-[#F4F3F0]">93.75%</span>
            <span className="text-[10px] text-[#A3A3A8] block mt-0.5">255 TP / 272 Actual</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0B0D] border border-white/[0.06]">
            <span className="text-[#66666E] uppercase block mb-1">ROC-AUC</span>
            <span className="text-2xl font-bold text-[#F4F3F0]">0.9965</span>
            <span className="text-[10px] text-[#A3A3A8] block mt-0.5">Area under curve</span>
          </div>
        </div>

        {/* Confusion Matrix Breakdown */}
        <div className="p-4 rounded-xl bg-[#0B0B0D] border border-white/[0.06] font-mono text-xs">
          <span className="text-[11px] text-[#A3A3A8] uppercase tracking-wider block mb-2 font-bold">
            Held-Out Confusion Matrix (Orientation: Rows = Actual, Columns = Predicted)
          </span>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-3 rounded-lg bg-[#141418] border border-white/[0.08]">
              <span className="text-[#54D6A0] font-bold text-lg block">610</span>
              <span className="text-[10px] text-[#66666E]">True Negatives (Ham Correct)</span>
            </div>
            <div className="p-3 rounded-lg bg-[#141418] border border-white/[0.08]">
              <span className="text-[#FF5D66] font-bold text-lg block">7</span>
              <span className="text-[10px] text-[#66666E]">False Positives (Ham Flagged)</span>
            </div>
            <div className="p-3 rounded-lg bg-[#141418] border border-white/[0.08]">
              <span className="text-[#FFB020] font-bold text-lg block">17</span>
              <span className="text-[10px] text-[#66666E]">False Negatives (Spam Missed)</span>
            </div>
            <div className="p-3 rounded-lg bg-[#141418] border border-white/[0.08]">
              <span className="text-[#54D6A0] font-bold text-lg block">255</span>
              <span className="text-[10px] text-[#66666E]">True Positives (Spam Correct)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Provenance & Historical Threat Limitations */}
      <div className="p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-4 font-mono text-xs">
        <div className="flex items-center gap-2.5">
          <Database className="w-5 h-5 text-[#B8F44A]" />
          <h2 className="text-base font-semibold text-[#F4F3F0]">
            Dataset Provenance &amp; Real-World Limitations
          </h2>
        </div>

        <p className="text-[#A3A3A8] leading-relaxed">
          The model was trained on the public <strong>Apache SpamAssassin Corpus</strong>, comprising 5,928 emails collected between <strong>2002 and 2005</strong> across five distinct partitions (<code>easy_ham</code>, <code>easy_ham_2</code>, <code>hard_ham</code>, <code>spam</code>, and <code>spam_2</code>).
        </p>

        {/* Warning Box */}
        <div className="p-4 rounded-xl bg-[#FFB020]/10 border border-[#FFB020]/30 text-[#FFB020] space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Critical Cybersecurity Limitations</span>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-[11px] text-[#FFB020]/90 leading-relaxed">
            <li>
              <strong>Historical Lexical Drift:</strong> Spammers in 2002&ndash;2005 heavily relied on pharmaceutical promotions, mortgage refinancing, and Nigerian 419 schemes. Modern threats employ subtle social engineering and credential harvesting without blatant spam keywords.
            </li>
            <li>
              <strong>Clean Brand Impersonation:</strong> Phishing emails that mimic legitimate bank or cloud alerts with clean, professional prose may be classified as Ham due to absence of historical spam tokens.
            </li>
            <li>
              <strong>Advisory Nature:</strong> SpamGuard AI predictions are probabilistic lexical estimates, not deterministic safety certificates. Always verify senders and external links independently.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
