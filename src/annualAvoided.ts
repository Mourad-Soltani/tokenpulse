import type { UsageEvent } from "./types.js";
import { blockedImpactStatus } from "./blockedImpact.js";

export type AnnualAvoidedStatus = {
  version: "tokenpulse-annual-avoided-v1";
  totalAvoidedUsd: number;
  daysWithBlocks: number;
  avgDailyAvoidedUsd: number;
  projectedAnnualAvoidedUsd: number;
  assumedPromptTokens: number;
  notes: string;
};

/** Pure annual projection of estimated avoided spend from block events. Visibility only. */
export function annualAvoidedStatus(events: UsageEvent[]): AnnualAvoidedStatus {
  const impact = blockedImpactStatus(events);
  const blocked = events.filter((e) => e.decision === "block");
  const days = new Set(blocked.map((e) => e.timestamp.slice(0, 10))).size || 1;
  const total = impact.estimatedAvoidedUsd;
  const avgDaily = Math.round((total / days) * 1_000_000) / 1_000_000;
  const projected = Math.round(avgDaily * 365 * 100) / 100;
  return {
    version: "tokenpulse-annual-avoided-v1",
    totalAvoidedUsd: Math.round(total * 100) / 100,
    daysWithBlocks: blocked.length === 0 ? 0 : days,
    avgDailyAvoidedUsd: blocked.length === 0 ? 0 : avgDaily,
    projectedAnnualAvoidedUsd: blocked.length === 0 ? 0 : projected,
    assumedPromptTokens: impact.assumedPromptTokens,
    notes:
      "Simple average of observed estimated avoided USD (fixed-token assumption on blocks) × 365. Does not change policy. No raw prompts.",
  };
}
