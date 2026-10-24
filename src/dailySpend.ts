import type { UsageEvent } from "./types.js";

export type DailySpendRow = {
  day: string; // YYYY-MM-DD UTC
  calls: number;
  tokens: number;
  costUsd: number;
};

export type DailySpendStatus = {
  version: "tokenpulse-daily-spend-v1";
  days: number;
  totalCostUsd: number;
  rows: DailySpendRow[];
  notes: string;
};

/** Last N UTC days of allowed spend. Does not change policy or metering. */
export function dailySpendStatus(events: UsageEvent[], windowDays = 7): DailySpendStatus {
  const allowed = events.filter((e) => e.decision === "allow");
  const buckets = new Map<string, { calls: number; tokens: number; costUsd: number }>();
  let totalCost = 0;
  for (const e of allowed) {
    const day = (e.timestamp || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const bucket = buckets.get(day) ?? { calls: 0, tokens: 0, costUsd: 0 };
    bucket.calls += 1;
    bucket.tokens += e.totalTokens ?? 0;
    bucket.costUsd += e.estimatedCostUsd ?? 0;
    buckets.set(day, bucket);
    totalCost += e.estimatedCostUsd ?? 0;
  }
  const allDays = [...buckets.keys()].sort().reverse().slice(0, windowDays);
  const rows: DailySpendRow[] = allDays
    .map((day) => {
      const b = buckets.get(day)!;
      return {
        day,
        calls: b.calls,
        tokens: b.tokens,
        costUsd: Math.round(b.costUsd * 1e6) / 1e6,
      };
    })
    .sort((a, b) => a.day.localeCompare(b.day));
  return {
    version: "tokenpulse-daily-spend-v1",
    days: rows.length,
    totalCostUsd: Math.round(totalCost * 1e6) / 1e6,
    rows,
    notes: `Estimated USD spend by UTC day on allowed events (last ${windowDays} days present). Notes and blocks excluded. No raw prompts.`,
  };
}
