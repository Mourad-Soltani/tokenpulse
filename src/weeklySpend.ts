import type { UsageEvent } from "./types.js";

export type WeeklySpendRow = {
  week: string; // YYYY-Www (ISO week, UTC)
  calls: number;
  tokens: number;
  costUsd: number;
};

export type WeeklySpendStatus = {
  version: "tokenpulse-weekly-spend-v1";
  weeks: number;
  totalCostUsd: number;
  rows: WeeklySpendRow[];
  notes: string;
};

/** ISO week key (YYYY-Www) for a UTC timestamp string. */
function isoWeekKey(ts: string): string | null {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  // ISO week: Thursday of the week determines the year
  const day = d.getUTCDay() || 7; // Mon=1 … Sun=7
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - day));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = thursday.getUTCFullYear();
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Last N UTC ISO weeks of allowed spend. Does not change policy or metering. */
export function weeklySpendStatus(events: UsageEvent[], windowWeeks = 8): WeeklySpendStatus {
  const allowed = events.filter((e) => e.decision === "allow");
  const buckets = new Map<string, { calls: number; tokens: number; costUsd: number }>();
  let totalCost = 0;
  for (const e of allowed) {
    const week = isoWeekKey(e.timestamp || "");
    if (!week) continue;
    const bucket = buckets.get(week) ?? { calls: 0, tokens: 0, costUsd: 0 };
    bucket.calls += 1;
    bucket.tokens += e.totalTokens ?? 0;
    bucket.costUsd += e.estimatedCostUsd ?? 0;
    buckets.set(week, bucket);
    totalCost += e.estimatedCostUsd ?? 0;
  }
  const allWeeks = [...buckets.keys()].sort().reverse().slice(0, windowWeeks);
  const rows: WeeklySpendRow[] = allWeeks
    .map((week) => {
      const b = buckets.get(week)!;
      return {
        week,
        calls: b.calls,
        tokens: b.tokens,
        costUsd: Math.round(b.costUsd * 1e6) / 1e6,
      };
    })
    .sort((a, b) => a.week.localeCompare(b.week));
  return {
    version: "tokenpulse-weekly-spend-v1",
    weeks: rows.length,
    totalCostUsd: Math.round(totalCost * 1e6) / 1e6,
    rows,
    notes: `Estimated USD spend by UTC ISO week on allowed events (last ${windowWeeks} weeks present). Notes and blocks excluded. No raw prompts.`,
  };
}
