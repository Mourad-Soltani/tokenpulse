import type { UsageEvent } from "./ledger.js";

export type AnnualProjectionStatus = {
  version: "tokenpulse-annual-v1";
  totalAllowedUsd: number;
  daysWithData: number;
  avgDailyUsd: number;
  projectedAnnualUsd: number;
  notes: string;
};

/** Pure annual projection from allowed events. Visibility only. */
export function annualProjectionStatus(events: UsageEvent[]): AnnualProjectionStatus {
  const allowed = events.filter((e) => e.decision === "allow" && e.estimatedCostUsd > 0);
  const total = allowed.reduce((s, e) => s + (e.estimatedCostUsd || 0), 0);
  const days = new Set(allowed.map((e) => e.timestamp.slice(0, 10))).size || 1;
  const avgDaily = Math.round((total / days) * 1_000_000) / 1_000_000;
  const projected = Math.round(avgDaily * 365 * 100) / 100;
  return {
    version: "tokenpulse-annual-v1",
    totalAllowedUsd: Math.round(total * 100) / 100,
    daysWithData: days,
    avgDailyUsd: avgDaily,
    projectedAnnualUsd: projected,
    notes: "Simple average of observed allowed spend × 365. Does not change policy. No raw prompts.",
  };
}
