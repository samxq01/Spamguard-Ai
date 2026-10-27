"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  fetchAuthStatus,
  fetchSettings,
  updateSettings as apiUpdateSettings,
  GmailAuthStatus,
  GmailScanResponse,
  ScannedEmailItem,
  SettingsData,
} from "./api";

export type WorkspaceTab =
  | "dashboard"
  | "inbox"
  | "detect"
  | "batch"
  | "analytics"
  | "accounts"
  | "settings"
  | "about";

interface SessionStatistics {
  emailsScannedSession: number;
  spamDetectedSession: number;
  hamDetectedSession: number;
  needsReviewSession: number;
  lastScanTimestamp: string | null;
}

interface WorkspaceContextType {
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  authStatus: GmailAuthStatus | null;
  authLoading: boolean;
  refreshAuth: () => Promise<void>;
  sessionStats: SessionStatistics;
  recordScan: (scan: GmailScanResponse) => void;
  recentActivity: ScannedEmailItem[];
  settings: SettingsData;
  settingsLoading: boolean;
  updateSettings: (low: number, high: number) => Promise<void>;
  inspectItem: ScannedEmailItem | null;
  setInspectItem: (item: ScannedEmailItem | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTabState] = useState<WorkspaceTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [authStatus, setAuthStatus] = useState<GmailAuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [sessionStats, setSessionStats] = useState<SessionStatistics>({
    emailsScannedSession: 0,
    spamDetectedSession: 0,
    hamDetectedSession: 0,
    needsReviewSession: 0,
    lastScanTimestamp: null,
  });

  const [recentActivity, setRecentActivity] = useState<ScannedEmailItem[]>([]);
  const [inspectItem, setInspectItem] = useState<ScannedEmailItem | null>(null);

  const [settings, setSettings] = useState<SettingsData>({
    threshold_low: 0.35,
    threshold_high: 0.65,
  });
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Sync active tab with URL hash or query if desired
  const setActiveTab = (tab: WorkspaceTab) => {
    setActiveTabState(tab);
    setMobileNavOpen(false);
    if (typeof window !== "undefined") {
      window.location.hash = tab;
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "") as WorkspaceTab;
      const validTabs: WorkspaceTab[] = [
        "dashboard",
        "inbox",
        "detect",
        "batch",
        "analytics",
        "accounts",
        "settings",
        "about",
      ];
      if (validTabs.includes(hash)) {
        setActiveTabState(hash);
      }
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      setAuthLoading(true);
      const data = await fetchAuthStatus();
      setAuthStatus(data);
    } catch {
      setAuthStatus({ authenticated: false, configured: false });
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      const data = await fetchSettings();
      setSettings(data);
    } catch {
      // keep defaults
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
    refreshSettings();
  }, [refreshAuth, refreshSettings]);

  const recordScan = (scan: GmailScanResponse) => {
    setSessionStats((prev) => ({
      emailsScannedSession: prev.emailsScannedSession + scan.total_scanned,
      spamDetectedSession: prev.spamDetectedSession + scan.spam_count,
      hamDetectedSession: prev.hamDetectedSession + scan.ham_count,
      needsReviewSession: prev.needsReviewSession + scan.review_count,
      lastScanTimestamp: scan.scan_timestamp,
    }));

    setRecentActivity((prev) => {
      const merged = [...scan.items, ...prev];
      // Keep most recent 50
      return merged.slice(0, 50);
    });
  };

  const handleUpdateSettings = async (low: number, high: number) => {
    const updated = await apiUpdateSettings(low, high);
    setSettings(updated);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        activeTab,
        setActiveTab,
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileNavOpen,
        setMobileNavOpen,
        authStatus,
        authLoading,
        refreshAuth,
        sessionStats,
        recordScan,
        recentActivity,
        settings,
        settingsLoading,
        updateSettings: handleUpdateSettings,
        inspectItem,
        setInspectItem,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
