import type { UsageEvent } from "./types.js";

export type HourlySpendRow = {
  hour: string; // YYYY-MM-DDTHH UTC
  calls: number;
  tokens: number;
  costUsd: number;
};

export type HourlySpendStatus = {
  version: "tokenpulse-hourly-spend-v1";
  hours: number;
  totalCostUsd: number;
  rows: HourlySpendRow[];
  notes: string;
};

/** Last N UTC hours of allowed spend. Does not change policy or metering. */
export function hourlySpendStatus(events: UsageEvent[], windowHours = 24): HourlySpendStatus {
  const allowed = events.filter((e) => e.decision === "allow");
  const buckets = new Map<string, { calls: number; tokens: number; costUsd: number }>();
  let totalCost = 0;
  for (const e of allowed) {
    const hour = (e.timestamp || "").slice(0, 13); // YYYY-MM-DDTHH
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(hour)) continue;
    const bucket = buckets.get(hour) ?? { calls: 0, tokens: 0, costUsd: 0 };
    bucket.calls += 1;
    bucket.tokens += e.totalTokens ?? 0;
    bucket.costUsd += e.estimatedCostUsd ?? 0;
    buckets.set(hour, bucket);
    totalCost += e.estimatedCostUsd ?? 0;
  }
  const allHours = [...buckets.keys()].sort().reverse().slice(0, windowHours);
  const rows: HourlySpendRow[] = allHours
    .map((hour) => {
      const b = buckets.get(hour)!;
      return {
        hour,
        calls: b.calls,
        tokens: b.tokens,
        costUsd: Math.round(b.costUsd * 1e6) / 1e6,
      };
    })
    .sort((a, b) => a.hour.localeCompare(b.hour));
  return {
    version: "tokenpulse-hourly-spend-v1",
    hours: rows.length,
    totalCostUsd: Math.round(totalCost * 1e6) / 1e6,
    rows,
    notes: `Estimated USD spend by UTC hour on allowed events (last ${windowHours} hours present). Notes and blocks excluded. No raw prompts.`,
  };
}
