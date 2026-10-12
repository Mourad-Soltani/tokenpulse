import type { AdminSummary } from "./admin.js";

export type AlertRow = {
  source: string;
  severity: "warn";
  message: string;
  detail?: string;
};

export type AlertsStatus = {
  version: "tokenpulse-alerts-v1";
  count: number;
  rows: AlertRow[];
  notes: string;
};

/** Aggregate operator-visible warns from existing status objects. No new policy. */
export function alertsStatus(summary: Pick<AdminSummary,
  "budgetWarns" | "rateWarns" | "limitWarns" | "discovery" | "unattributed" | "keys"
>): AlertsStatus {
  const rows: AlertRow[] = [];

  if (summary.budgetWarns > 0) {
    rows.push({
      source: "budget",
      severity: "warn",
      message: `${summary.budgetWarns} budget cap(s) at or above warn ratio or exhausted`,
    });
  }
  if (summary.rateWarns > 0) {
    rows.push({
      source: "rate",
      severity: "warn",
      message: `${summary.rateWarns} rate limit(s) at or above warn ratio or exhausted`,
    });
  }
  if (summary.limitWarns > 0) {
    rows.push({
      source: "limits",
      severity: "warn",
      message: `${summary.limitWarns} request-size hard block(s) configured (max_tokens=0)`,
    });
  }
  if (summary.discovery?.warn) {
    rows.push({
      source: "discovery",
      severity: "warn",
      message: `Unknown-model spend $${summary.discovery.unknownCostUsd} ≥ threshold $${summary.discovery.warnThresholdUsd}`,
      detail: `${summary.discovery.unknownModelCount} model(s)`,
    });
  }
  if (summary.unattributed?.warn) {
    rows.push({
      source: "unattributed",
      severity: "warn",
      message: `Unattributed (default team/app) spend $${summary.unattributed.unattributedCostUsd} ≥ threshold $${summary.unattributed.warnThresholdUsd}`,
    });
  }
  const keys = summary.keys as { idleWarnCount?: number; expiryWarnCount?: number } | undefined;
  if (keys?.idleWarnCount && keys.idleWarnCount > 0) {
    rows.push({
      source: "keys",
      severity: "warn",
      message: `${keys.idleWarnCount} client key(s) idle (no recent calls)`,
    });
  }
  if (keys?.expiryWarnCount && keys.expiryWarnCount > 0) {
    rows.push({
      source: "keys",
      severity: "warn",
      message: `${keys.expiryWarnCount} client key(s) expiring soon`,
    });
  }

  return {
    version: "tokenpulse-alerts-v1",
    count: rows.length,
    rows,
    notes: "Operator visibility only. Does not change block policy. Thresholds remain on their source status objects.",
  };
}
