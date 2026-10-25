import type { UsageEvent } from "./types.js";

export type EndpointSpendRow = {
  endpoint: string; // "chat" | "embeddings"
  calls: number;
  tokens: number;
  costUsd: number;
  pct: number;
};

export type EndpointSpendStatus = {
  version: "tokenpulse-endpoint-spend-v1";
  uniqueEndpoints: number;
  totalCostUsd: number;
  rows: EndpointSpendRow[];
  notes: string;
};

function endpointOf(e: UsageEvent): string {
  return e.policyIds?.some((p) => p === "endpoint:embeddings") ? "embeddings" : "chat";
}

/** Allowed spend grouped by endpoint (chat vs embeddings). Does not change policy or metering. */
export function endpointSpendStatus(events: UsageEvent[]): EndpointSpendStatus {
  const allowed = events.filter((e) => e.decision === "allow");
  const buckets = new Map<string, { calls: number; tokens: number; costUsd: number }>();
  let totalCost = 0;
  for (const e of allowed) {
    const ep = endpointOf(e);
    const bucket = buckets.get(ep) ?? { calls: 0, tokens: 0, costUsd: 0 };
    bucket.calls += 1;
    bucket.tokens += e.totalTokens ?? 0;
    bucket.costUsd += e.estimatedCostUsd ?? 0;
    buckets.set(ep, bucket);
    totalCost += e.estimatedCostUsd ?? 0;
  }
  const rows: EndpointSpendRow[] = [...buckets.entries()]
    .map(([endpoint, b]) => ({
      endpoint,
      calls: b.calls,
      tokens: b.tokens,
      costUsd: Math.round(b.costUsd * 1e6) / 1e6,
      pct: totalCost > 0 ? Math.round((b.costUsd / totalCost) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.costUsd - a.costUsd || a.endpoint.localeCompare(b.endpoint));
  return {
    version: "tokenpulse-endpoint-spend-v1",
    uniqueEndpoints: rows.length,
    totalCostUsd: Math.round(totalCost * 1e6) / 1e6,
    rows,
    notes: "Estimated USD spend by endpoint (chat vs embeddings) on allowed events. Notes and blocks excluded. No raw prompts.",
  };
}
