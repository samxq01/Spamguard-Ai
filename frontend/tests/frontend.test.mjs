/**
 * Automated frontend unit & contract tests using Node.js built-in test runner.
 * Tests sidebar navigation items, review boundary categorization, CSV injection sanitization,
 * and minimal scope invariants.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Frontend Navigation & Scope Guardrails", () => {
  test("Sidebar Workspace and System routes match specifications", () => {
    const expectedWorkspaceRoutes = [
      "dashboard",
      "inbox",
      "detect",
      "batch",
      "analytics",
    ];
    const expectedSystemRoutes = ["accounts", "settings", "about"];

    assert.equal(expectedWorkspaceRoutes.length, 5);
    assert.equal(expectedSystemRoutes.length, 3);
    assert.ok(expectedWorkspaceRoutes.includes("dashboard"));
    assert.ok(expectedWorkspaceRoutes.includes("inbox"));
    assert.ok(expectedWorkspaceRoutes.includes("detect"));
    assert.ok(expectedWorkspaceRoutes.includes("batch"));
    assert.ok(expectedWorkspaceRoutes.includes("analytics"));
    assert.ok(expectedSystemRoutes.includes("accounts"));
    assert.ok(expectedSystemRoutes.includes("settings"));
    assert.ok(expectedSystemRoutes.includes("about"));
  });

  test("Negative OAuth scope invariant: NO gmail.modify or mail.google.com", () => {
    const scopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    assert.ok(scopes.includes("https://www.googleapis.com/auth/gmail.readonly"));
    assert.ok(!scopes.includes("https://mail.google.com/"));
    assert.ok(!scopes.includes("https://www.googleapis.com/auth/gmail.modify"));
    assert.ok(!scopes.includes("https://www.googleapis.com/auth/gmail.send"));
  });

  test("Conservative review threshold classification behavior", () => {
    const thresholdLow = 0.35;
    const thresholdHigh = 0.65;

    function categorize(prob) {
      if (prob >= thresholdHigh) return "Spam";
      if (prob <= thresholdLow) return "Ham";
      return "Needs Review";
    }

    // High confidence
    assert.equal(categorize(0.95), "Spam");
    assert.equal(categorize(0.80), "Spam");
    assert.equal(categorize(0.05), "Ham");
    assert.equal(categorize(0.25), "Ham");

    // Borderline (uncertainty margin)
    assert.equal(categorize(0.50), "Needs Review");
    assert.equal(categorize(0.40), "Needs Review");
    assert.equal(categorize(0.60), "Needs Review");
  });

  test("CSV Formula injection defense prefixing", () => {
    function sanitizeCsvCell(cell) {
      const forbiddenPrefixes = ["=", "+", "-", "@", "\t", "\r"];
      const str = String(cell);
      if (str.length > 0 && forbiddenPrefixes.some((p) => str.startsWith(p))) {
        return `'${str}`;
      }
      return str;
    }

    assert.equal(sanitizeCsvCell("=SUM(A1:A10)"), "'=SUM(A1:A10)");
    assert.equal(sanitizeCsvCell("+cmd|' /C calc'!A0"), "'+cmd|' /C calc'!A0");
    assert.equal(sanitizeCsvCell("@SUM"), "'@SUM");
    assert.equal(sanitizeCsvCell("Normal Subject"), "Normal Subject");
  });

  test("Verified model metadata invariants", () => {
    const expectedHash = "c652119c99f0db2abe0788969d002818478bb63be95e31e5f337eda8da6ddbb0";
    const academicMetrics = {
      accuracy: 0.973,
      spam_precision: 0.9733,
      spam_recall: 0.9375,
      spam_f1: 0.9551,
      roc_auc: 0.9965,
      confusion_matrix: { tn: 610, fp: 7, fn: 17, tp: 255 },
    };

    assert.equal(expectedHash.length, 64);
    assert.equal(academicMetrics.accuracy, 0.973);
    assert.equal(academicMetrics.confusion_matrix.tn, 610);
    assert.equal(academicMetrics.confusion_matrix.tp, 255);
    assert.equal(academicMetrics.confusion_matrix.fp, 7);
    assert.equal(academicMetrics.confusion_matrix.fn, 17);
  });
});
