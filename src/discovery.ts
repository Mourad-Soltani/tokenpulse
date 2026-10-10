import type { UsageEvent } from "./types.js";
import { PRICING_TABLE } from "./pricing.js";

export type DiscoveryRow = {
  model: string;
  calls: number;
  lastSeenAt: string;
  teams: string[];
  apps: string[];
};

export type DiscoveryStatus = {
  version: "tokenpulse-discovery-v1";
  unknownModelCount: number;
  unknownCalls: number;
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
  const map = new Map<string, { calls: number; lastSeenAt: string; teams: Set<string>; apps: Set<string> }>();
  for (const e of events) {
    if (!e.model || e.decision === "note") continue;
    if (isKnownCatalogModel(e.model)) continue;
    const key = e.model;
    const cur = map.get(key) ?? { calls: 0, lastSeenAt: e.timestamp, teams: new Set(), apps: new Set() };
    cur.calls += 1;
    if (e.timestamp > cur.lastSeenAt) cur.lastSeenAt = e.timestamp;
    if (e.teamId) cur.teams.add(e.teamId);
    if (e.appId) cur.apps.add(e.appId);
    map.set(key, cur);
  }
  const rows: DiscoveryRow[] = [...map.entries()]
    .map(([model, v]) => ({
      model,
      calls: v.calls,
      lastSeenAt: v.lastSeenAt,
      teams: [...v.teams].sort(),
      apps: [...v.apps].sort(),
    }))
    .sort((a, b) => b.calls - a.calls || b.lastSeenAt.localeCompare(a.lastSeenAt));
  const unknownCalls = rows.reduce((n, r) => n + r.calls, 0);
  return {
    version: "tokenpulse-discovery-v1",
    unknownModelCount: rows.length,
    unknownCalls,
    rows,
    notes: "Models requested that are absent from the static pricing catalog. Not a block. No raw prompts.",
  };
}
