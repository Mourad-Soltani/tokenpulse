import type { UsageEvent } from "./types.js";

export type TeamEfficiencyRow = {
  teamId: string;
  calls: number;
  tokens: number;
  costUsd: number;
  usdPer1MTokens: number;
  avgTokensPerCall: number;
};

export type TeamEfficiencyStatus = {
  version: "tokenpulse-team-efficiency-v1";
  calls: number;
  totalTokens: number;
  totalCostUsd: number;
  overallUsdPer1MTokens: number;
  overallAvgTokensPerCall: number;
  rows: TeamEfficiencyRow[];
  notes: string;
};

/** Cost efficiency (USD per 1M tokens) by team on allowed events. Does not change policy or metering. */
export function teamEfficiencyStatus(events: UsageEvent[], top = 10): TeamEfficiencyStatus {
  const allowed = events.filter((e) => e.decision === "allow");
  const byTeam = new Map<string, { calls: number; tokens: number; costUsd: number }>();
  let totalCalls = 0;
  let totalTokens = 0;
  let totalCost = 0;

  for (const e of allowed) {
    const team = e.teamId || "default";
    const bucket = byTeam.get(team) ?? { calls: 0, tokens: 0, costUsd: 0 };
    bucket.calls += 1;
    bucket.tokens += e.totalTokens ?? 0;
    bucket.costUsd += e.estimatedCostUsd ?? 0;
    byTeam.set(team, bucket);
    totalCalls += 1;
    totalTokens += e.totalTokens ?? 0;
    totalCost += e.estimatedCostUsd ?? 0;
  }

  const rows: TeamEfficiencyRow[] = [...byTeam.entries()]
    .map(([teamId, b]) => ({
      teamId,
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
    version: "tokenpulse-team-efficiency-v1",
    calls: totalCalls,
    totalTokens,
    totalCostUsd: Math.round(totalCost * 1e6) / 1e6,
    overallUsdPer1MTokens: overallUsdPer1M,
    overallAvgTokensPerCall: overallAvgTok,
    rows,
    notes: "USD per 1M tokens by team on allowed events (lowest first). Notes and blocks excluded. No raw prompts.",
  };
}
