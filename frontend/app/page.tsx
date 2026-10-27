"use client";

import React from "react";
import {
  WorkspaceProvider,
  useWorkspace,
  WorkspaceTab,
} from "@/lib/WorkspaceContext";
import Sidebar from "@/components/Sidebar";
import DashboardView from "@/components/DashboardView";
import GmailInboxView from "@/components/GmailInboxView";
import EmailScanner from "@/components/EmailScanner";
import BatchScanner from "@/components/BatchScanner";
import ModelAnalytics from "@/components/ModelAnalytics";
import ConnectedAccountsView from "@/components/ConnectedAccountsView";
import SettingsView from "@/components/SettingsView";
import AboutModelView from "@/components/AboutModelView";
import MessageDetailDrawer from "@/components/MessageDetailDrawer";
import {
  Menu,
  ShieldAlert,
  Radio,
  Mail,
  Lock,
  ExternalLink,
} from "lucide-react";

function WorkspaceMain() {
  const {
    activeTab,
    setActiveTab,
    setMobileNavOpen,
    authStatus,
    authLoading,
  } = useWorkspace();

  const isConnected = !!authStatus?.authenticated;

  const getBreadcrumbTitle = (tab: WorkspaceTab) => {
    switch (tab) {
      case "dashboard":
        return "WORKSPACE / Dashboard";
      case "inbox":
        return "WORKSPACE / Gmail Inbox";
      case "detect":
        return "WORKSPACE / Spam Detection";
      case "batch":
        return "WORKSPACE / Batch Scanner";
      case "analytics":
        return "WORKSPACE / Model Analytics";
      case "accounts":
        return "SYSTEM / Connected Accounts";
      case "settings":
        return "SYSTEM / Settings";
      case "about":
        return "SYSTEM / About the Model";
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0B0B0D] text-[#F4F3F0]">
      {/* Left Sidebar (Desktop Fixed + Mobile Drawer) */}
      <Sidebar />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workstation Header Bar */}
        <header className="h-16 px-4 sm:px-8 border-b border-white/[0.08] bg-[#0E0E12]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 rounded-xl text-[#A3A3A8] hover:text-[#F4F3F0] hover:bg-white/[0.06] transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Title */}
            <span className="font-mono text-xs uppercase tracking-wider text-[#A3A3A8]">
              {getBreadcrumbTitle(activeTab)}
            </span>
          </div>

          {/* Right Header Status Telemetry */}
          <div className="flex items-center gap-3">
            {/* Account Status Pill */}
            <button
              type="button"
              onClick={() => setActiveTab(isConnected ? "inbox" : "accounts")}
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-[11px] border transition-colors ${
                isConnected
                  ? "bg-[#54D6A0]/10 border-[#54D6A0]/30 text-[#54D6A0]"
                  : "bg-white/[0.04] border-white/[0.08] text-[#A3A3A8] hover:text-[#F4F3F0]"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-[#54D6A0] animate-pulse" : "bg-[#66666E]"
                }`}
              />
              <span>
                {authLoading
                  ? "Verifying..."
                  : isConnected
                  ? authStatus?.email
                  : "Gmail Offline"}
              </span>
            </button>

            {/* Model Hash Lock Badge */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141418] border border-white/[0.08] text-[10px] font-mono text-[#66666E]"
              title="Verified Model SHA-256: c652119c99f0db2abe0788969d002818478bb63be95e31e5f337eda8da6ddbb0"
            >
              <Lock className="w-3 h-3 text-[#54D6A0]" />
              <span>SHA-256 Certified</span>
            </div>
          </div>
        </header>

        {/* Scrollable Workstation Workspace */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {activeTab === "dashboard" && <DashboardView />}
          {activeTab === "inbox" && <GmailInboxView />}
          {activeTab === "detect" && <EmailScanner />}
          {activeTab === "batch" && <BatchScanner />}
          {activeTab === "analytics" && <ModelAnalytics />}
          {activeTab === "accounts" && <ConnectedAccountsView />}
          {activeTab === "settings" && <SettingsView />}
          {activeTab === "about" && <AboutModelView />}
        </main>

        {/* Workstation Footer */}
        <footer className="p-4 sm:px-8 border-t border-white/[0.08] bg-[#0E0E12] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-[#66666E]">
          <div className="flex items-center gap-2">
            <span>SpamGuard AI Enterprise Workstation</span>
            <span>&bull;</span>
            <span>Semester 3 AI Micro Project</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Privacy-First: Zero Mail Storage</span>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setActiveTab("about")}
              className="hover:text-[#F4F3F0] transition-colors underline"
            >
              Methodology &amp; Provenance
            </button>
          </div>
        </footer>
      </div>

      {/* Global Slide-Over Inspection Drawer */}
      <MessageDetailDrawer />
    </div>
  );
}

export default function Home() {
  return (
    <WorkspaceProvider>
      <WorkspaceMain />
    </WorkspaceProvider>
  );
}
