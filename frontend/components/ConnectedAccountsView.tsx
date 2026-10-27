"use client";

import React, { useState } from "react";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Mail,
  ExternalLink,
  Shield,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Lock,
  Terminal,
} from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { startGoogleAuth, disconnectGmail } from "@/lib/api";

export default function ConnectedAccountsView() {
  const { authStatus, authLoading, refreshAuth } = useWorkspace();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isConnected = !!authStatus?.authenticated;
  const isConfigured = authStatus?.configured ?? true;
  const redirectUri = authStatus?.setup_instructions?.redirect_uri || "http://localhost:8000/api/auth/google/callback";

  const handleConnect = async () => {
    setActionError(null);
    setConnecting(true);
    try {
      const data = await startGoogleAuth();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to initialize Google OAuth flow.");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your Google account and revoke access?")) {
      return;
    }
    setActionError(null);
    setDisconnecting(true);
    try {
      await disconnectGmail();
      await refreshAuth();
    } catch (err: any) {
      setActionError(err.message || "Failed to disconnect account.");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleCopyRedirect = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-white/[0.08]">
        <h1 className="text-2xl font-bold tracking-tight text-[#F4F3F0]">
          Connected Accounts &amp; Permissions
        </h1>
        <p className="text-xs text-[#A3A3A8] font-mono mt-1">
          OAuth 2.0 authorization lifecycle, minimal scope policies, and Google Cloud credentials
        </p>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-[#FF5D66]/10 border border-[#FF5D66]/30 text-[#FF5D66] text-xs font-mono flex items-center justify-between">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Connection Card */}
      <div className="p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                isConnected
                  ? "bg-[#54D6A0]/10 border-[#54D6A0]/30 text-[#54D6A0]"
                  : "bg-white/[0.04] border-white/[0.08] text-[#A3A3A8]"
              }`}
            >
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#F4F3F0]">
                  Google Gmail Account
                </h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isConnected
                      ? "bg-[#54D6A0]/20 text-[#54D6A0] border border-[#54D6A0]/30"
                      : "bg-[#66666E]/20 text-[#A3A3A8] border border-white/[0.08]"
                  }`}
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <p className="text-xs text-[#A3A3A8] font-mono mt-0.5">
                {isConnected
                  ? `Authorized Mailbox: ${authStatus.email}`
                  : "Official Google OAuth 2.0 Consent Protocol"}
              </p>
            </div>
          </div>

          <div>
            {isConnected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-4 py-2 rounded-xl bg-[#FF5D66]/10 hover:bg-[#FF5D66]/20 text-[#FF5D66] border border-[#FF5D66]/30 text-xs font-mono font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{disconnecting ? "Revoking..." : "Disconnect & Revoke"}</span>
              </button>
            ) : isConfigured ? (
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="px-5 py-2.5 rounded-xl bg-[#B8F44A] text-[#0B0B0D] font-mono text-xs font-bold hover:bg-[#a6e03e] transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{connecting ? "Redirecting..." : "Connect Gmail"}</span>
              </button>
            ) : (
              <span className="text-xs font-mono text-[#FFB020] px-3 py-1.5 rounded-lg bg-[#FFB020]/10 border border-[#FFB020]/20">
                Setup Required
              </span>
            )}
          </div>
        </div>

        {/* Permission Scopes & Guardrails */}
        <div className="pt-4 border-t border-white/[0.08]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#66666E] block mb-3">
            Active Security Guardrails &amp; Minimal Scopes
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[#0B0B0D] border border-white/[0.06] space-y-1">
              <div className="flex items-center gap-2 text-[#54D6A0] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>https://www.googleapis.com/auth/gmail.readonly</span>
              </div>
              <p className="text-[11px] text-[#66666E] pl-5.5">
                Permits read-only inspection of email headers and readable body text.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0B0B0D] border border-white/[0.06] space-y-1">
              <div className="flex items-center gap-2 text-[#54D6A0] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>openid, userinfo.email, userinfo.profile</span>
              </div>
              <p className="text-[11px] text-[#66666E] pl-5.5">
                Authenticates mailbox ownership and displays the connected identity.
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-[#0B0B0D] border border-white/[0.06] text-xs font-mono text-[#A3A3A8] space-y-1">
            <div className="flex items-center gap-1.5 text-[#54D6A0] font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>Negative Scope Guarantee</span>
            </div>
            <p className="text-[11px] text-[#66666E]">
              SpamGuard AI strictly never requests <code>gmail.modify</code> or <code>mail.google.com</code>. The application cannot send emails, delete messages, modify labels, or alter your mailbox contents.
            </p>
          </div>
        </div>
      </div>

      {/* Setup Guide when Unconfigured or for Local Testing */}
      <div className="p-6 rounded-2xl bg-[#141418] border border-white/[0.08] space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#B8F44A]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#F4F3F0] font-mono">
              Google Cloud Console Configuration Guide
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#A3A3A8] px-2 py-0.5 rounded bg-white/[0.04]">
            OAuth 2.0 Web Application
          </span>
        </div>

        <p className="text-xs text-[#A3A3A8] font-mono leading-relaxed">
          To enable authentic Gmail API synchronization, configure a Google Cloud project and supply your client credentials in your local environment.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-[#0B0B0D] border border-white/[0.06]">
            <span className="text-[#B8F44A] font-bold block mb-1">Step 1: Create Google Cloud Project</span>
            <span className="text-[#A3A3A8]">
              Visit <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-[#F4F3F0] underline">Google Cloud Console</a> and create a project named &ldquo;SpamGuard AI&rdquo;.
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0B0D] border border-white/[0.06]">
            <span className="text-[#B8F44A] font-bold block mb-1">Step 2: Enable Gmail API</span>
            <span className="text-[#A3A3A8]">
              Under <strong>APIs &amp; Services &gt; Library</strong>, search for <strong>Gmail API</strong> and click <strong>Enable</strong>.
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0B0D] border border-white/[0.06]">
            <span className="text-[#B8F44A] font-bold block mb-1">Step 3: Configure OAuth Consent Screen &amp; Test Users</span>
            <span className="text-[#A3A3A8]">
              Select User Type <strong>External</strong>, name the application, add scope <code>https://www.googleapis.com/auth/gmail.readonly</code>, and in <strong>Test Users</strong>, add your Gmail address.
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0B0D] border border-white/[0.06]">
            <span className="text-[#B8F44A] font-bold block mb-1">Step 4: Create OAuth Client ID &amp; Set Redirect URI</span>
            <div className="text-[#A3A3A8] space-y-2 mt-1">
              <span>Under <strong>Credentials &gt; Create Credentials &gt; OAuth client ID</strong>, choose <strong>Web application</strong>. Add the following Authorized Redirect URI:</span>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#141418] border border-white/[0.1] text-[#F4F3F0] select-all">
                <code className="text-xs flex-1">{redirectUri}</code>
                <button
                  type="button"
                  onClick={handleCopyRedirect}
                  className="p-1 hover:text-[#B8F44A] transition-colors"
                  title="Copy Redirect URI"
                >
                  {copiedRedirect ? <Check className="w-3.5 h-3.5 text-[#54D6A0]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0B0D] border border-white/[0.06]">
            <span className="text-[#B8F44A] font-bold block mb-1">Step 5: Set Environment Variables</span>
            <span className="text-[#A3A3A8] block mb-2">
              Add your credentials to your local <code>.env</code> file (see <code>.env.example</code>):
            </span>
            <pre className="p-2.5 rounded-lg bg-[#141418] border border-white/[0.08] text-[#B8F44A] text-[11px] overflow-x-auto">
{`GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=${redirectUri}
APP_SESSION_SECRET=generate_a_random_32_char_secret`}
            </pre>
          </div>
        </div>

        {/* Verification and Scope Disclaimer */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono text-[#66666E] leading-relaxed">
          <strong className="text-[#A3A3A8]">Verification Disclaimer:</strong> In development/testing status, Google restricts OAuth access exclusively to accounts listed under <em>Test Users</em>. Connecting via OAuth does not mean SpamGuard AI is operated, certified, or endorsed by Google LLC.
        </div>
      </div>
    </div>
  );
}
