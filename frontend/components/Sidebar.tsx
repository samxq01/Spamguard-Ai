"use client";

import React from "react";
import {
  LayoutDashboard,
  Mail,
  ShieldCheck,
  FileSpreadsheet,
  BarChart3,
  Users,
  Settings,
  Info,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Radio,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { useWorkspace, WorkspaceTab } from "@/lib/WorkspaceContext";

interface NavItem {
  id: WorkspaceTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

export default function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileNavOpen,
    setMobileNavOpen,
    authStatus,
    authLoading,
  } = useWorkspace();

  const workspaceNav: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      id: "inbox",
      label: "Gmail Inbox",
      icon: Mail,
      badge: authStatus?.authenticated ? "LIVE" : undefined,
      badgeColor: "bg-[#54D6A0]/20 text-[#54D6A0] border-[#54D6A0]/40",
    },
    { id: "detect", label: "Spam Detection", icon: ShieldCheck },
    { id: "batch", label: "Batch Scanner", icon: FileSpreadsheet },
    { id: "analytics", label: "Model Analytics", icon: BarChart3 },
  ];

  const systemNav: NavItem[] = [
    {
      id: "accounts",
      label: "Connected Accounts",
      icon: Users,
      badge: authStatus?.authenticated ? "1" : "0",
    },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "about", label: "About the Model", icon: Info },
  ];

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="mb-6">
      {!sidebarCollapsed && (
        <span className="px-3 text-[10px] font-mono uppercase tracking-[0.18em] text-[#66666E] font-medium block mb-2 select-none">
          {title}
        </span>
      )}
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setActiveTab(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 group relative ${
                  isActive
                    ? "bg-[#1A1A20] text-[#F4F3F0] border border-white/[0.12] shadow-sm shadow-black/40"
                    : "text-[#A3A3A8] hover:text-[#F4F3F0] hover:bg-white/[0.04] border border-transparent"
                } ${sidebarCollapsed ? "justify-center" : ""}`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#B8F44A] rounded-r-full" />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive
                      ? "text-[#B8F44A]"
                      : "text-[#66666E] group-hover:text-[#A3A3A8]"
                  }`}
                />
                {!sidebarCollapsed && (
                  <span className="truncate flex-1 text-left tracking-wide font-sans">
                    {item.label}
                  </span>
                )}
                {!sidebarCollapsed && item.badge && (
                  <span
                    className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                      item.badgeColor || "bg-white/[0.06] text-[#A3A3A8] border-white/[0.08]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/[0.08] px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#141418] border border-white/[0.15] flex items-center justify-center text-[#B8F44A] shadow-inner">
              <ShieldAlert className="w-4 h-4" />
            </div>
            {!sidebarCollapsed && (
              <div className="leading-none">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#F4F3F0] block">
                  SpamGuard<span className="text-[#B8F44A]">.AI</span>
                </span>
                <span className="font-mono text-[9px] text-[#66666E] tracking-tight">
                  ENTERPRISE SECURITY
                </span>
              </div>
            )}
          </div>

          {/* Desktop Toggle Button */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="hidden md:flex items-center justify-center w-6 h-6 rounded-lg text-[#66666E] hover:text-[#F4F3F0] hover:bg-white/[0.06] transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Navigation Groups */}
        <nav>
          {renderNavGroup("WORKSPACE", workspaceNav)}
          {renderNavGroup("SYSTEM", systemNav)}
        </nav>
      </div>

      {/* Account & Engine Status Card */}
      <div className="pt-4 border-t border-white/[0.08]">
        {!sidebarCollapsed ? (
          <div className="p-3 rounded-xl bg-[#141418] border border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-[#66666E] uppercase tracking-wider">
                Connection
              </span>
              <span className="flex items-center gap-1 font-mono text-[9px] text-[#54D6A0]">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                {authLoading
                  ? "Checking..."
                  : authStatus?.authenticated
                  ? "Connected"
                  : "Offline"}
              </span>
            </div>
            <div className="text-[11px] font-mono text-[#F4F3F0] truncate font-medium">
              {authStatus?.authenticated
                ? authStatus.email || "Active User"
                : "Gmail Unlinked"}
            </div>
            <div className="text-[9px] font-mono text-[#66666E] truncate mt-0.5">
              Engine: MultinomialNB (Frozen)
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <span
              className={`w-2 h-2 rounded-full ${
                authStatus?.authenticated ? "bg-[#54D6A0]" : "bg-[#66666E]"
              }`}
              title={
                authStatus?.authenticated
                  ? `Connected: ${authStatus.email}`
                  : "Gmail Disconnected"
              }
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-[#0E0E12] border-r border-white/[0.08] p-4 transition-all duration-200 shrink-0 select-none z-30 sticky top-0 h-screen ${
          sidebarCollapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileNavOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="w-[280px] bg-[#0E0E12] h-full p-4 border-r border-white/[0.1] shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex justify-end mb-2">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1.5 text-[#66666E] hover:text-[#F4F3F0] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
