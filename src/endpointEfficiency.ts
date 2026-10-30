import type { UsageEvent } from "./types.js";

export type EndpointEfficiencyRow = {
  endpoint: string; // "chat" | "embeddings"
  calls: number;
  tokens: number;
  costUsd: number;
  usdPer1MTokens: number;
  avgTokensPerCall: number;
};

export type EndpointEfficiencyStatus = {
  version: "tokenpulse-endpoint-efficiency-v1";
  calls: number;
  totalTokens: number;
  totalCostUsd: number;
  overallUsdPer1MTokens: number;
  overallAvgTokensPerCall: number;
  rows: EndpointEfficiencyRow[];
  notes: string;
};

function endpointOf(e: UsageEvent): string {
  return e.policyIds?.some((p) => p === "endpoint:embeddings") ? "embeddings" : "chat";
}

/** Cost efficiency (USD per 1M tokens) by endpoint (chat vs embeddings) on allowed events. Does not change policy or metering. */
export function endpointEfficiencyStatus(events: UsageEvent[], top = 10): EndpointEfficiencyStatus {
  const allowed = events.filter((e) => e.decision === "allow");
  const byEp = new Map<string, { calls: number; tokens: number; costUsd: number }>();
  let totalCalls = 0;
  let totalTokens = 0;
  let totalCost = 0;

  for (const e of allowed) {
    const ep = endpointOf(e);
    const bucket = byEp.get(ep) ?? { calls: 0, tokens: 0, costUsd: 0 };
    bucket.calls += 1;
    bucket.tokens += e.totalTokens ?? 0;
    bucket.costUsd += e.estimatedCostUsd ?? 0;
    byEp.set(ep, bucket);
    totalCalls += 1;
    totalTokens += e.totalTokens ?? 0;
    totalCost += e.estimatedCostUsd ?? 0;
  }

  const rows: EndpointEfficiencyRow[] = [...byEp.entries()]
    .map(([endpoint, b]) => ({
      endpoint,
      calls: b.calls,
      tokens: b.tokens,
      costUsd: Math.round(b.costUsd * 1e6) / 1e6,
      usdPer1MTokens: b.tokens > 0 ? Math.round((b.costUsd / b.tokens) * 1e6 * 1e6) / 1e6 : 0,
      avgTokensPerCall: b.calls > 0 ? Math.round((b.tokens / b.calls) * 10) / 10 : 0,
    }))
    .sort((a, b) => a.usdPer1MTokens - b.usdPer1MTokens || b.tokens - a.tokens)
    .slice(0, top);

  const overallUsdPer1M = totalTokens > 0 ? Math.round((totalCost / totalTokens) * 1e6 * 1e6) / 1e6 : 0;
  const overallAvgTok = totalCalls > 0 ? Math.round((totalTokens / totalCalls) * 10) / 10 : 0;

  return {
    version: "tokenpulse-endpoint-efficiency-v1",
    calls: totalCalls,
    totalTokens,
    totalCostUsd: Math.round(totalCost * 1e6) / 1e6,
    overallUsdPer1MTokens: overallUsdPer1M,
    overallAvgTokensPerCall: overallAvgTok,
    rows,
    notes: "USD per 1M tokens by endpoint (chat vs embeddings) on allowed events (lowest first). Notes and blocks excluded. No raw prompts.",
  };
}
