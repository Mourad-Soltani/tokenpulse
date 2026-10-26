import type { UsageEvent } from "./types.js";

export type UpstreamSpendRow = {
  source: string; // e.g. "openai", "xai", "mock", "unknown"
  calls: number;
  tokens: number;
  costUsd: number;
  pct: number;
};

export type UpstreamSpendStatus = {
  version: "tokenpulse-upstream-spend-v1";
  uniqueSources: number;
  totalCostUsd: number;
  rows: UpstreamSpendRow[];
  notes: string;
};

function sourceOf(e: UsageEvent): string {
  const ids = e.policyIds ?? [];
  for (const p of ids) {
    if (p.startsWith("upstream:")) {
      const s = p.slice("upstream:".length).trim();
      if (s) return s;
    }
  }
  if (ids.includes("mock-allow")) return "mock";
  return "unknown";
}

/** Allowed spend grouped by upstream source (or mock). Does not change policy or metering. */
export function upstreamSpendStatus(events: UsageEvent[]): UpstreamSpendStatus {
  const allowed = events.filter((e) => e.decision === "allow");
  const buckets = new Map<string, { calls: number; tokens: number; costUsd: number }>();
  let totalCost = 0;
  for (const e of allowed) {
    const src = sourceOf(e);
    const bucket = buckets.get(src) ?? { calls: 0, tokens: 0, costUsd: 0 };
    bucket.calls += 1;
    bucket.tokens += e.totalTokens ?? 0;
    bucket.costUsd += e.estimatedCostUsd ?? 0;
    buckets.set(src, bucket);
    totalCost += e.estimatedCostUsd ?? 0;
  }
  const rows: UpstreamSpendRow[] = [...buckets.entries()]
    .map(([source, b]) => ({
      source,
      calls: b.calls,
      tokens: b.tokens,
      costUsd: Math.round(b.costUsd * 1e6) / 1e6,
      pct: totalCost > 0 ? Math.round((b.costUsd / totalCost) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.costUsd - a.costUsd || a.source.localeCompare(b.source));
  return {
    version: "tokenpulse-upstream-spend-v1",
    uniqueSources: rows.length,
    totalCostUsd: Math.round(totalCost * 1e6) / 1e6,
    rows,
    notes: "Estimated USD spend by upstream source (policy id upstream:<source>) or mock on allowed events. Notes and blocks excluded. No raw prompts.",
  };
}
