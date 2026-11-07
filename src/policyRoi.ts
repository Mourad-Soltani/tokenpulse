import type { UsageEvent } from "./types.js";
import { blockedImpactStatus } from "./blockedImpact.js";

export type PolicyRoiStatus = {
  version: "tokenpulse-policy-roi-v1";
  allowedCostUsd: number;
  estimatedAvoidedUsd: number;
  totalPotentialUsd: number;
  avoidedPct: number;
  note: string;
};

/** Single-number policy ROI for CFO/CISO demo: estimated avoided vs allowed spend. Visibility only. */
export function policyRoiStatus(events: UsageEvent[]): PolicyRoiStatus {
  const allowed = events
    .filter((e) => e.decision === "allow")
    .reduce((sum, e) => sum + (Number(e.estimatedCostUsd) || 0), 0);
  const impact = blockedImpactStatus(events);
  const avoided = impact.estimatedAvoidedUsd;
  const total = allowed + avoided;
  const pct = total > 0 ? Math.round((avoided / total) * 1000) / 10 : 0;
  return {
    version: "tokenpulse-policy-roi-v1",
    allowedCostUsd: Math.round(allowed * 1e6) / 1e6,
    estimatedAvoidedUsd: Math.round(avoided * 1e6) / 1e6,
    totalPotentialUsd: Math.round(total * 1e6) / 1e6,
    avoidedPct: pct,
    note: "Avoided uses the same fixed-token assumption as blocked impact. Demo/visibility only — not ledgered. No raw prompts.",
  };
}
