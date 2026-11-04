import type { UsageEvent } from "./types.js";
import { priceFor } from "./pricing.js";

export type BlockedImpactByWeekRow = {
  week: string; // YYYY-Www (ISO week, UTC)
  blocks: number;
  estimatedAvoidedUsd: number;
  pct: number;
};

export type BlockedImpactByWeekStatus = {
  version: "tokenpulse-blocked-impact-by-week-v1";
  totalBlocks: number;
  uniqueWeeks: number;
  estimatedAvoidedUsd: number;
  assumedPromptTokens: number;
  rows: BlockedImpactByWeekRow[];
  notes: string;
};

function assumedTokens(): number {
  const raw = process.env.TOKENPULSE_BLOCKED_ASSUME_TOKENS;
  const n = raw ? Number(raw) : 256;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 256;
}

/** ISO week key (YYYY-Www) for a UTC timestamp string. Matches weeklySpend. */
function isoWeekKey(ts: string): string | null {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  // ISO week: Thursday of the week determines the year
  const day = d.getUTCDay() || 7; // Mon=1 … Sun=7
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - day));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = thursday.getUTCFullYear();
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Estimated avoided USD by UTC ISO week on blocked requests (fixed prompt-token assumption). Visibility only. */
export function blockedImpactByWeekStatus(events: UsageEvent[], top = 12): BlockedImpactByWeekStatus {
  const blocked = events.filter((e) => e.decision === "block");
  const assume = assumedTokens();
  const buckets = new Map<string, { blocks: number; avoided: number }>();
  let totalAvoided = 0;
  for (const e of blocked) {
    const week = isoWeekKey(e.timestamp || "");
    if (!week) continue;
    const model = e.model || "(none)";
    const price = priceFor(model);
    const avoided = (assume / 1_000_000) * price.input;
    const b = buckets.get(week) ?? { blocks: 0, avoided: 0 };
    b.blocks += 1;
    b.avoided += avoided;
    buckets.set(week, b);
    totalAvoided += avoided;
  }
  const rows: BlockedImpactByWeekRow[] = [...buckets.entries()]
    .map(([week, b]) => ({
      week,
      blocks: b.blocks,
      estimatedAvoidedUsd: Math.round(b.avoided * 1e6) / 1e6,
      pct: blocked.length === 0 ? 0 : Math.round((b.blocks / blocked.length) * 1000) / 10,
    }))
    .sort((a, b) => b.estimatedAvoidedUsd - a.estimatedAvoidedUsd || b.week.localeCompare(a.week))
    .slice(0, top);
  return {
    version: "tokenpulse-blocked-impact-by-week-v1",
    totalBlocks: blocked.length,
    uniqueWeeks: buckets.size,
    estimatedAvoidedUsd: Math.round(totalAvoided * 1e6) / 1e6,
    assumedPromptTokens: assume,
    rows,
    notes: `Estimated avoided USD by UTC ISO week on block events using a fixed ${assume}-token prompt assumption × model input price. Blocks store zero real tokens. Demo/visibility only — not ledgered cost. No raw prompts.`,
  };
}
