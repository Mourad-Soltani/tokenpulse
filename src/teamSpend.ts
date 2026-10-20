import type { UsageEvent } from "./types.js";

export type TeamSpendRow = {
  teamId: string;
  calls: number;
  tokens: number;
  costUsd: number;
  percent: number;
};

export type TeamSpendStatus = {
  version: "tokenpulse-team-spend-v1";
  totalCostUsd: number;
  uniqueTeams: number;
  rows: TeamSpendRow[];
  notes: string;
};

const TOP_N = 12;

/** Operator visibility of estimated spend by team. Allowed events only. Does not change attribution or policy. */
export function teamSpendStatus(events: UsageEvent[]): TeamSpendStatus {
  const allowed = events.filter((e) => e.decision === "allow");
  const buckets = new Map<string, { calls: number; tokens: number; costUsd: number }>();
  let totalCost = 0;
  for (const e of allowed) {
    const teamId = e.teamId || "default";
    const bucket = buckets.get(teamId) ?? { calls: 0, tokens: 0, costUsd: 0 };
    bucket.calls += 1;
    bucket.tokens += e.totalTokens ?? 0;
    bucket.costUsd += e.estimatedCostUsd ?? 0;
    buckets.set(teamId, bucket);
    totalCost += e.estimatedCostUsd ?? 0;
  }
  const rows: TeamSpendRow[] = [...buckets.entries()]
    .map(([teamId, b]) => ({
      teamId,
      calls: b.calls,
      tokens: b.tokens,
      costUsd: Math.round(b.costUsd * 1e6) / 1e6,
      percent: totalCost === 0 ? 0 : Math.round((b.costUsd / totalCost) * 1000) / 10,
    }))
    .sort((a, b) => b.costUsd - a.costUsd || a.teamId.localeCompare(b.teamId))
    .slice(0, TOP_N);
  return {
    version: "tokenpulse-team-spend-v1",
    totalCostUsd: Math.round(totalCost * 1e6) / 1e6,
    uniqueTeams: buckets.size,
    rows,
    notes: "Estimated USD spend by teamId on allowed events in the selected window. Notes and blocks excluded. No raw prompts.",
  };
}
