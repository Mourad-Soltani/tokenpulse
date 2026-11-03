import type { UsageEvent } from "./types.js";
import { priceFor } from "./pricing.js";

export type BlockedImpactByHourRow = {
  hour: string; // YYYY-MM-DDTHH UTC
  blocks: number;
  estimatedAvoidedUsd: number;
  pct: number;
};

export type BlockedImpactByHourStatus = {
  version: "tokenpulse-blocked-impact-by-hour-v1";
  totalBlocks: number;
  uniqueHours: number;
  estimatedAvoidedUsd: number;
  assumedPromptTokens: number;
  rows: BlockedImpactByHourRow[];
  notes: string;
};

function assumedTokens(): number {
  const raw = process.env.TOKENPULSE_BLOCKED_ASSUME_TOKENS;
  const n = raw ? Number(raw) : 256;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 256;
}

/** Estimated avoided USD by UTC hour on blocked requests (fixed prompt-token assumption). Visibility only. */
export function blockedImpactByHourStatus(events: UsageEvent[], top = 24): BlockedImpactByHourStatus {
  const blocked = events.filter((e) => e.decision === "block");
  const assume = assumedTokens();
  const buckets = new Map<string, { blocks: number; avoided: number }>();
  let totalAvoided = 0;
  for (const e of blocked) {
    const hour = (e.timestamp || "").slice(0, 13); // YYYY-MM-DDTHH
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}$/.test(hour)) continue;
    const model = e.model || "(none)";
    const price = priceFor(model);
    const avoided = (assume / 1_000_000) * price.input;
    const b = buckets.get(hour) ?? { blocks: 0, avoided: 0 };
    b.blocks += 1;
    b.avoided += avoided;
    buckets.set(hour, b);
    totalAvoided += avoided;
  }
  const rows: BlockedImpactByHourRow[] = [...buckets.entries()]
    .map(([hour, b]) => ({
      hour,
      blocks: b.blocks,
      estimatedAvoidedUsd: Math.round(b.avoided * 1e6) / 1e6,
      pct: blocked.length === 0 ? 0 : Math.round((b.blocks / blocked.length) * 1000) / 10,
    }))
    .sort((a, b) => b.estimatedAvoidedUsd - a.estimatedAvoidedUsd || b.hour.localeCompare(a.hour))
    .slice(0, top);
  return {
    version: "tokenpulse-blocked-impact-by-hour-v1",
    totalBlocks: blocked.length,
    uniqueHours: buckets.size,
    estimatedAvoidedUsd: Math.round(totalAvoided * 1e6) / 1e6,
    assumedPromptTokens: assume,
    rows,
    notes: `Estimated avoided USD by UTC hour on block events using a fixed ${assume}-token prompt assumption × model input price. Blocks store zero real tokens. Demo/visibility only — not ledgered cost. No raw prompts.`,
  };
}
