import type { UsageEvent } from "./types.js";

export type MonthlySpendRow = {
  month: string; // YYYY-MM UTC
  calls: number;
  tokens: number;
  costUsd: number;
};

export type MonthlySpendStatus = {
  version: "tokenpulse-monthly-spend-v1";
  months: number;
  totalCostUsd: number;
  rows: MonthlySpendRow[];
  notes: string;
};

/** Last N UTC months of allowed spend. Does not change policy or metering. */
export function monthlySpendStatus(events: UsageEvent[], windowMonths = 6): MonthlySpendStatus {
  const allowed = events.filter((e) => e.decision === "allow");
  const buckets = new Map<string, { calls: number; tokens: number; costUsd: number }>();
  let totalCost = 0;
  for (const e of allowed) {
    const month = (e.timestamp || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const bucket = buckets.get(month) ?? { calls: 0, tokens: 0, costUsd: 0 };
    bucket.calls += 1;
    bucket.tokens += e.totalTokens ?? 0;
    bucket.costUsd += e.estimatedCostUsd ?? 0;
    buckets.set(month, bucket);
    totalCost += e.estimatedCostUsd ?? 0;
  }
  const allMonths = [...buckets.keys()].sort().reverse().slice(0, windowMonths);
  const rows: MonthlySpendRow[] = allMonths
    .map((month) => {
      const b = buckets.get(month)!;
      return {
        month,
        calls: b.calls,
        tokens: b.tokens,
        costUsd: Math.round(b.costUsd * 1e6) / 1e6,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
  return {
    version: "tokenpulse-monthly-spend-v1",
    months: rows.length,
    totalCostUsd: Math.round(totalCost * 1e6) / 1e6,
    rows,
    notes: `Estimated USD spend by UTC month on allowed events (last ${windowMonths} months present). Notes and blocks excluded. No raw prompts.`,
  };
}
