import type { UsageEvent } from "./types.js";
import { PRICING_TABLE } from "./pricing.js";

export type DiscoveryRow = {
  model: string;
  calls: number;
  estimatedCostUsd: number;
  lastSeenAt: string;
  teams: string[];
  apps: string[];
};

export type DiscoveryStatus = {
  version: "tokenpulse-discovery-v1";
  unknownModelCount: number;
  unknownCalls: number;
  unknownCostUsd: number;
  rows: DiscoveryRow[];
  notes: string;
};

/** True when the model id is in the static pricing catalog (exact or after /). */
export function isKnownCatalogModel(model: string): boolean {
  const key = model.toLowerCase();
  if (PRICING_TABLE[key]) return true;
  const short = key.split("/").pop() ?? "";
  return !!PRICING_TABLE[short];
}

/** Shadow-AI signal: models seen in the ledger that are not in the pricing catalog. */
export function discoveryStatus(events: UsageEvent[]): DiscoveryStatus {
  const map = new Map<string, { calls: number; cost: number; lastSeenAt: string; teams: Set<string>; apps: Set<string> }>();
  for (const e of events) {
    if (!e.model || e.decision === "note") continue;
    if (isKnownCatalogModel(e.model)) continue;
    const key = e.model;
    const cur = map.get(key) ?? { calls: 0, cost: 0, lastSeenAt: e.timestamp, teams: new Set(), apps: new Set() };
    cur.calls += 1;
    cur.cost += Number(e.estimatedCostUsd) || 0;
    if (e.timestamp > cur.lastSeenAt) cur.lastSeenAt = e.timestamp;
    if (e.teamId) cur.teams.add(e.teamId);
    if (e.appId) cur.apps.add(e.appId);
    map.set(key, cur);
  }
  const rows: DiscoveryRow[] = [...map.entries()]
    .map(([model, v]) => ({
      model,
      calls: v.calls,
      estimatedCostUsd: Math.round(v.cost * 1_000_000) / 1_000_000,
      lastSeenAt: v.lastSeenAt,
      teams: [...v.teams].sort(),
      apps: [...v.apps].sort(),
    }))
    .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd || b.calls - a.calls || b.lastSeenAt.localeCompare(a.lastSeenAt));
  const unknownCalls = rows.reduce((n, r) => n + r.calls, 0);
  const unknownCostUsd = Math.round(rows.reduce((n, r) => n + r.estimatedCostUsd, 0) * 1_000_000) / 1_000_000;
  return {
    version: "tokenpulse-discovery-v1",
    unknownModelCount: rows.length,
    unknownCalls,
    unknownCostUsd,
    rows,
    notes: "Models requested that are absent from the static pricing catalog. Cost uses the event estimatedCostUsd (fallback price when unknown). Not a block. No raw prompts.",
  };
}
