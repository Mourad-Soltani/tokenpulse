import type { UsageEvent } from "./types.js";

export type AppSpendRow = {
  appId: string;
  calls: number;
  tokens: number;
  costUsd: number;
  percent: number;
};

export type AppSpendStatus = {
  version: "tokenpulse-app-spend-v1";
  totalCostUsd: number;
  uniqueApps: number;
  rows: AppSpendRow[];
  notes: string;
};

const TOP_N = 12;

/** Operator visibility of estimated spend by app. Allowed events only. Does not change attribution or policy. */
export function appSpendStatus(events: UsageEvent[]): AppSpendStatus {
  const allowed = events.filter((e) => e.decision === "allow");
  const buckets = new Map<string, { calls: number; tokens: number; costUsd: number }>();
  let totalCost = 0;
  for (const e of allowed) {
    const appId = e.appId || "default";
    const bucket = buckets.get(appId) ?? { calls: 0, tokens: 0, costUsd: 0 };
    bucket.calls += 1;
    bucket.tokens += e.totalTokens ?? 0;
    bucket.costUsd += e.estimatedCostUsd ?? 0;
    buckets.set(appId, bucket);
    totalCost += e.estimatedCostUsd ?? 0;
  }
  const rows: AppSpendRow[] = [...buckets.entries()]
    .map(([appId, b]) => ({
      appId,
      calls: b.calls,
      tokens: b.tokens,
      costUsd: Math.round(b.costUsd * 1e6) / 1e6,
      percent: totalCost === 0 ? 0 : Math.round((b.costUsd / totalCost) * 1000) / 10,
    }))
    .sort((a, b) => b.costUsd - a.costUsd || a.appId.localeCompare(b.appId))
    .slice(0, TOP_N);
  return {
    version: "tokenpulse-app-spend-v1",
    totalCostUsd: Math.round(totalCost * 1e6) / 1e6,
    uniqueApps: buckets.size,
    rows,
    notes: "Estimated USD spend by appId on allowed events in the selected window. Notes and blocks excluded. No raw prompts.",
  };
}
