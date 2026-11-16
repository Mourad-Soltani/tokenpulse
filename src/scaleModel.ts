import type { UsageEvent } from "./types.js";
import { requestVolumeStatus } from "./requestVolume.js";

export type ScaleModelStatus = {
  version: "tokenpulse-scale-model-v1";
  observedBlockRate: number;
  avgCostPerAllowedUsd: number;
  targetMonthlyRequests: number;
  projectedMonthlyAvoidedUsd: number;
  projectedAnnualAvoidedUsd: number;
  assumptions: string[];
  notes: string;
};

/** Transparent scale model: project avoided USD at a target volume using observed block rate × avg allowed cost. Visibility only. */
export function scaleModelStatus(
  events: UsageEvent[],
  opts?: { monthlyRequests?: number },
): ScaleModelStatus {
  const vol = requestVolumeStatus(events);
  const totalPolicy = vol.allowedCount + vol.blockedCount;
  const blockRate = totalPolicy > 0 ? vol.blockedCount / totalPolicy : 0;
  const monthly = Math.max(1, Math.floor(opts?.monthlyRequests ?? 1_000_000));
  const monthlyAvoided = Math.round(monthly * blockRate * vol.avgCostPerAllowedUsd * 100) / 100;
  const annualAvoided = Math.round(monthlyAvoided * 12 * 100) / 100;
  return {
    version: "tokenpulse-scale-model-v1",
    observedBlockRate: Math.round(blockRate * 10000) / 10000,
    avgCostPerAllowedUsd: vol.avgCostPerAllowedUsd,
    targetMonthlyRequests: monthly,
    projectedMonthlyAvoidedUsd: monthlyAvoided,
    projectedAnnualAvoidedUsd: annualAvoided,
    assumptions: [
      "Block rate observed in the current ledger window is representative.",
      "Average cost of an allowed request is a reasonable proxy for the cost of a blocked request that would have been allowed.",
      "Target volume is operator-chosen (default 1M requests/month). Not derived from the ledger.",
      "No compounding, seasonality, or mix shift. Linear projection only.",
    ],
    notes:
      "Separate scale model for CFO conversations. Uses observed block rate × avg allowed cost × target volume. Not a ledger fact and not the fixed-token avoided-$ estimator. No raw prompts.",
  };
}
