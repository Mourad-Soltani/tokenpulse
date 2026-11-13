import type { UsageEvent } from "./types.js";

export type RequestVolumeStatus = {
  version: "tokenpulse-request-volume-v1";
  totalRequests: number;
  allowedCount: number;
  blockedCount: number;
  noteCount: number;
  avgCostPerAllowedUsd: number;
  avgTokensPerAllowed: number;
  daysWithData: number;
  requestsPerDay: number;
  notes: string;
};

/** Pure request volume stats for operator / buyer visibility. No raw prompts. */
export function requestVolumeStatus(events: UsageEvent[]): RequestVolumeStatus {
  const total = events.length;
  const allowed = events.filter((e) => e.decision === "allow");
  const blocked = events.filter((e) => e.decision === "block");
  const notes = events.filter((e) => e.decision === "note");
  const allowedCost = allowed.reduce((s, e) => s + (e.estimatedCostUsd || 0), 0);
  const allowedTokens = allowed.reduce((s, e) => s + (e.totalTokens || 0), 0);
  const days = new Set(
    events.map((e) => (e.timestamp || "").slice(0, 10)).filter((d) => d.length >= 10),
  ).size || 1;
  const avgCost = allowed.length ? Math.round((allowedCost / allowed.length) * 1e6) / 1e6 : 0;
  const avgTokens = allowed.length ? Math.round(allowedTokens / allowed.length) : 0;
  const perDay = Math.round((total / days) * 100) / 100;
  return {
    version: "tokenpulse-request-volume-v1",
    totalRequests: total,
    allowedCount: allowed.length,
    blockedCount: blocked.length,
    noteCount: notes.length,
    avgCostPerAllowedUsd: avgCost,
    avgTokensPerAllowed: avgTokens,
    daysWithData: days,
    requestsPerDay: perDay,
    notes:
      "Counts from the selected window. Notes are separate from allow/block. Visibility only — does not change policy. No raw prompts.",
  };
}
