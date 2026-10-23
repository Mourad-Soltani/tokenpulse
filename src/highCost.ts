import type { UsageEvent } from "./types.js";

export type HighCostRow = {
  id: string;
  timestamp: string;
  teamId: string;
  appId: string;
  model: string;
  totalTokens: number;
  estimatedCostUsd: number;
  requestId?: string;
};

export type HighCostStatus = {
  version: "tokenpulse-high-cost-v1";
  topN: number;
  rows: HighCostRow[];
  notes: string;
};

const TOP_N = 10;

/** Operator visibility of the highest-cost allowed requests in the window. No raw prompts. */
export function highCostStatus(events: UsageEvent[]): HighCostStatus {
  const allowed = events
    .filter((e) => e.decision === "allow" && (e.estimatedCostUsd ?? 0) > 0)
    .sort((a, b) => (b.estimatedCostUsd ?? 0) - (a.estimatedCostUsd ?? 0) || (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
  const rows: HighCostRow[] = allowed.slice(0, TOP_N).map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    teamId: e.teamId || "default",
    appId: e.appId || "default",
    model: e.model || "(unknown)",
    totalTokens: e.totalTokens ?? 0,
    estimatedCostUsd: Math.round((e.estimatedCostUsd ?? 0) * 1e6) / 1e6,
    requestId: e.requestId,
  }));
  return {
    version: "tokenpulse-high-cost-v1",
    topN: TOP_N,
    rows,
    notes: "Top allowed requests by estimated USD cost in the selected window. Notes and blocks excluded. No raw prompts or message text.",
  };
}
