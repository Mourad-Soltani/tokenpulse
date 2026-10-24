import type { UsageEvent } from "./types.js";

export type SlowRequestRow = {
  id: string;
  timestamp: string;
  teamId: string;
  appId: string;
  model: string;
  latencyMs: number;
  totalTokens: number;
  estimatedCostUsd: number;
  requestId?: string;
};

export type SlowRequestStatus = {
  version: "tokenpulse-slow-requests-v1";
  topN: number;
  rows: SlowRequestRow[];
  notes: string;
};

const TOP_N = 10;

/** Operator visibility of the slowest allowed requests in the window. No raw prompts. */
export function slowRequestStatus(events: UsageEvent[]): SlowRequestStatus {
  const allowed = events
    .filter((e) => e.decision === "allow" && (e.latencyMs ?? 0) > 0)
    .sort((a, b) => (b.latencyMs ?? 0) - (a.latencyMs ?? 0) || (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
  const rows: SlowRequestRow[] = allowed.slice(0, TOP_N).map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    teamId: e.teamId || "default",
    appId: e.appId || "default",
    model: e.model || "(unknown)",
    latencyMs: e.latencyMs ?? 0,
    totalTokens: e.totalTokens ?? 0,
    estimatedCostUsd: Math.round((e.estimatedCostUsd ?? 0) * 1e6) / 1e6,
    requestId: e.requestId,
  }));
  return {
    version: "tokenpulse-slow-requests-v1",
    topN: TOP_N,
    rows,
    notes: "Top allowed requests by latencyMs in the selected window. Notes and blocks excluded. No raw prompts or message text.",
  };
}
