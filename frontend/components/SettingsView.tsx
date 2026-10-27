"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Sliders,
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
  AlertTriangle,
  Save,
  Trash2,
  Info,
} from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";

export default function SettingsView() {
  const { settings, updateSettings, settingsLoading } = useWorkspace();

  const [thresholdLow, setThresholdLow] = useState(settings.threshold_low);
  const [thresholdHigh, setThresholdHigh] = useState(settings.threshold_high);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setThresholdLow(settings.threshold_low);
    setThresholdHigh(settings.threshold_high);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (thresholdLow >= thresholdHigh) {
      setSaveError("Lower threshold must be strictly less than upper threshold.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateSettings(thresholdLow, thresholdHigh);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update review threshold settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setThresholdLow(0.35);
    setThresholdHigh(0.65);
    setSaveError(null);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-white/[0.08]">
        <h1 className="text-2xl font-bold tracking-tight text-[#F4F3F0]">
          System Settings &amp; Review Boundaries
        </h1>
        <p className="text-xs text-[#A3A3A8] font-mono mt-1">
          Customize conservative decision boundaries for borderline predictions
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-[#54D6A0]/10 border border-[#54D6A0]/30 text-[#54D6A0] text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Review thresholds updated successfully and applied to active session.</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-[#FF5D66]/10 border border-[#FF5D66]/30 text-[#FF5D66] text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Threshold Configuration Card */}
      <form onSubmit={handleSave} className="p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#B8F44A]" />
            <h3 className="text-base font-semibold text-[#F4F3F0]">
              Decision Boundary Margins
            </h3>
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs font-mono text-[#A3A3A8] hover:text-[#F4F3F0] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults (35% / 65%)</span>
          </button>
        </div>

        <p className="text-xs text-[#A3A3A8] font-mono leading-relaxed">
          The underlying model parameters remain strictly frozen. However, borderline predictions falling inside the uncertainty margin are routed to &ldquo;Needs Review&rdquo; rather than binary automatic labeling.
        </p>

        {/* Visual Boundary Diagram */}
        <div className="p-4 rounded-xl bg-[#0B0B0D] border border-white/[0.08] space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#54D6A0] font-bold">HAM (SAFE): 0% &ndash; {(thresholdLow * 100).toFixed(0)}%</span>
            <span className="text-[#FFB020] font-bold">NEEDS REVIEW: {(thresholdLow * 100).toFixed(0)}% &ndash; {(thresholdHigh * 100).toFixed(0)}%</span>
            <span className="text-[#FF5D66] font-bold">SPAM (THREAT): {(thresholdHigh * 100).toFixed(0)}% &ndash; 100%</span>
          </div>

          <div className="h-4 w-full rounded-full overflow-hidden flex border border-white/[0.08]">
            <div
              className="bg-[#54D6A0] h-full flex items-center justify-center text-[10px] text-black font-bold"
              style={{ width: `${thresholdLow * 100}%` }}
            >
              Ham
            </div>
            <div
              className="bg-[#FFB020] h-full flex items-center justify-center text-[10px] text-black font-bold"
              style={{ width: `${(thresholdHigh - thresholdLow) * 100}%` }}
            >
              Review
            </div>
            <div
              className="bg-[#FF5D66] h-full flex items-center justify-center text-[10px] text-white font-bold"
              style={{ width: `${(1 - thresholdHigh) * 100}%` }}
            >
              Spam
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-xs">
          {/* Low Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-[#A3A3A8] font-bold">
                Lower Boundary (Ham Ceiling):
              </label>
              <span className="text-[#F4F3F0] font-bold">{(thresholdLow * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.49"
              step="0.01"
              value={thresholdLow}
              onChange={(e) => setThresholdLow(parseFloat(e.target.value))}
              className="w-full accent-[#54D6A0] cursor-pointer"
            />
            <span className="text-[10px] text-[#66666E] block">
              Messages below this score are treated as legitimate email.
            </span>
          </div>

          {/* High Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-[#A3A3A8] font-bold">
                Upper Boundary (Spam Floor):
              </label>
              <span className="text-[#F4F3F0] font-bold">{(thresholdHigh * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.51"
              max="0.90"
              step="0.01"
              value={thresholdHigh}
              onChange={(e) => setThresholdHigh(parseFloat(e.target.value))}
              className="w-full accent-[#FF5D66] cursor-pointer"
            />
            <span className="text-[10px] text-[#66666E] block">
              Messages above this score are flagged as high-confidence spam.
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
          <span className="text-[11px] font-mono text-[#66666E]">
            Stored separately from model pipeline weights
          </span>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#B8F44A] text-[#0B0B0D] font-mono text-xs font-bold hover:bg-[#a6e03e] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save Boundaries"}</span>
          </button>
        </div>
      </form>

      {/* Safety Policy & Model Lock Card */}
      <div className="p-6 rounded-2xl bg-[#0E0E12] border border-white/[0.06] space-y-3 font-mono text-xs">
        <div className="flex items-center gap-2 text-[#F4F3F0] font-bold">
          <Info className="w-4 h-4 text-[#B8F44A]" />
          <span>Cryptographic Model Immutability Guarantee</span>
        </div>
        <p className="text-[#A3A3A8] text-xs leading-relaxed">
          The underlying classifier is cryptographically validated at startup and on every inference pass:
        </p>
        <div className="p-3 rounded-lg bg-[#141418] border border-white/[0.08] text-[11px] text-[#B8F44A] select-all break-all">
          SHA-256: c652119c99f0db2abe0788969d002818478bb63be95e31e5f337eda8da6ddbb0
        </div>
        <p className="text-[11px] text-[#66666E]">
          The model weights cannot be modified, retrained, or altered via the user interface.
        </p>
      </div>
    </div>
  );
}
