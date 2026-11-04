import type { UsageEvent } from "./types.js";
import { priceFor } from "./pricing.js";

export type BlockedImpactByMonthRow = {
  month: string; // YYYY-MM (UTC)
  blocks: number;
  estimatedAvoidedUsd: number;
  pct: number;
};

export type BlockedImpactByMonthStatus = {
  version: "tokenpulse-blocked-impact-by-month-v1";
  totalBlocks: number;
  uniqueMonths: number;
  estimatedAvoidedUsd: number;
  assumedPromptTokens: number;
  rows: BlockedImpactByMonthRow[];
  notes: string;
};

function assumedTokens(): number {
  const raw = process.env.TOKENPULSE_BLOCKED_ASSUME_TOKENS;
  const n = raw ? Number(raw) : 256;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 256;
}

/** UTC month key (YYYY-MM) for a timestamp string. Matches monthlySpend. */
function monthKey(ts: string): string | null {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Estimated avoided USD by UTC month on blocked requests (fixed prompt-token assumption). Visibility only. */
export function blockedImpactByMonthStatus(events: UsageEvent[], top = 12): BlockedImpactByMonthStatus {
  const blocked = events.filter((e) => e.decision === "block");
  const assume = assumedTokens();
  const buckets = new Map<string, { blocks: number; avoided: number }>();
  let totalAvoided = 0;
  for (const e of blocked) {
    const month = monthKey(e.timestamp || "");
    if (!month) continue;
    const model = e.model || "(none)";
    const price = priceFor(model);
    const avoided = (assume / 1_000_000) * price.input;
    const b = buckets.get(month) ?? { blocks: 0, avoided: 0 };
    b.blocks += 1;
    b.avoided += avoided;
    buckets.set(month, b);
    totalAvoided += avoided;
  }
  const rows: BlockedImpactByMonthRow[] = [...buckets.entries()]
    .map(([month, b]) => ({
      month,
      blocks: b.blocks,
      estimatedAvoidedUsd: Math.round(b.avoided * 1e6) / 1e6,
      pct: blocked.length === 0 ? 0 : Math.round((b.blocks / blocked.length) * 1000) / 10,
    }))
    .sort((a, b) => b.estimatedAvoidedUsd - a.estimatedAvoidedUsd || b.month.localeCompare(a.month))
    .slice(0, top);
  return {
    version: "tokenpulse-blocked-impact-by-month-v1",
    totalBlocks: blocked.length,
    uniqueMonths: buckets.size,
    estimatedAvoidedUsd: Math.round(totalAvoided * 1e6) / 1e6,
    assumedPromptTokens: assume,
    rows,
    notes: `Estimated avoided USD by UTC month on block events using a fixed ${assume}-token prompt assumption × model input price. Blocks store zero real tokens. Demo/visibility only — not ledgered cost. No raw prompts.`,
  };
}
