import type { UsageEvent } from "./types.js";

export type TokenVolumeRow = {
  id: string;
  timestamp: string;
  teamId: string;
  appId: string;
  model: string;
  totalTokens: number;
  estimatedCostUsd: number;
  requestId?: string;
};

export type TokenVolumeStatus = {
  version: "tokenpulse-token-volume-v1";
  topN: number;
  rows: TokenVolumeRow[];
  notes: string;
};

const TOP_N = 10;

/** Operator visibility of the highest-token allowed requests in the window. No raw prompts. */
export function tokenVolumeStatus(events: UsageEvent[]): TokenVolumeStatus {
  const allowed = events
    .filter((e) => e.decision === "allow" && (e.totalTokens ?? 0) > 0)
    .sort((a, b) => (b.totalTokens ?? 0) - (a.totalTokens ?? 0) || (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
  const rows: TokenVolumeRow[] = allowed.slice(0, TOP_N).map((e) => ({
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
    version: "tokenpulse-token-volume-v1",
    topN: TOP_N,
    rows,
    notes: "Top allowed requests by totalTokens in the selected window. Notes and blocks excluded. No raw prompts or message text.",
  };
}
