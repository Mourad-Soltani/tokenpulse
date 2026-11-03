import type { UsageEvent } from "./types.js";
import { priceFor } from "./pricing.js";

export type BlockedImpactByDayRow = {
  day: string; // YYYY-MM-DD UTC
  blocks: number;
  estimatedAvoidedUsd: number;
  pct: number;
};

export type BlockedImpactByDayStatus = {
  version: "tokenpulse-blocked-impact-by-day-v1";
  totalBlocks: number;
  uniqueDays: number;
  estimatedAvoidedUsd: number;
  assumedPromptTokens: number;
  rows: BlockedImpactByDayRow[];
  notes: string;
};

function assumedTokens(): number {
  const raw = process.env.TOKENPULSE_BLOCKED_ASSUME_TOKENS;
  const n = raw ? Number(raw) : 256;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 256;
}

/** Estimated avoided USD by UTC day on blocked requests (fixed prompt-token assumption). Visibility only. */
export function blockedImpactByDayStatus(events: UsageEvent[], top = 14): BlockedImpactByDayStatus {
  const blocked = events.filter((e) => e.decision === "block");
  const assume = assumedTokens();
  const buckets = new Map<string, { blocks: number; avoided: number }>();
  let totalAvoided = 0;
  for (const e of blocked) {
    const day = (e.timestamp || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const model = e.model || "(none)";
    const price = priceFor(model);
    const avoided = (assume / 1_000_000) * price.input;
    const b = buckets.get(day) ?? { blocks: 0, avoided: 0 };
    b.blocks += 1;
    b.avoided += avoided;
    buckets.set(day, b);
    totalAvoided += avoided;
  }
  const rows: BlockedImpactByDayRow[] = [...buckets.entries()]
    .map(([day, b]) => ({
      day,
      blocks: b.blocks,
      estimatedAvoidedUsd: Math.round(b.avoided * 1e6) / 1e6,
      pct: blocked.length === 0 ? 0 : Math.round((b.blocks / blocked.length) * 1000) / 10,
    }))
    .sort((a, b) => b.estimatedAvoidedUsd - a.estimatedAvoidedUsd || b.day.localeCompare(a.day))
    .slice(0, top);
  return {
    version: "tokenpulse-blocked-impact-by-day-v1",
    totalBlocks: blocked.length,
    uniqueDays: buckets.size,
    estimatedAvoidedUsd: Math.round(totalAvoided * 1e6) / 1e6,
    assumedPromptTokens: assume,
    rows,
    notes: `Estimated avoided USD by UTC day on block events using a fixed ${assume}-token prompt assumption × model input price. Blocks store zero real tokens. Demo/visibility only — not ledgered cost. No raw prompts.`,
  };
}
