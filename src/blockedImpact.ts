import type { UsageEvent } from "./types.js";
import { priceFor } from "./pricing.js";

export type BlockedImpactRow = {
  model: string;
  blocks: number;
  estimatedAvoidedUsd: number;
  pct: number;
};

export type BlockedImpactStatus = {
  version: "tokenpulse-blocked-impact-v1";
  totalBlocks: number;
  uniqueModels: number;
  estimatedAvoidedUsd: number;
  assumedPromptTokens: number;
  rows: BlockedImpactRow[];
  notes: string;
};

const TOP_N = 12;

function assumedTokens(): number {
  const raw = process.env.TOKENPULSE_BLOCKED_ASSUME_TOKENS;
  const n = raw ? Number(raw) : 256;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 256;
}

/** Estimated USD that would have been spent if blocked requests had been allowed at a fixed prompt-token assumption. Demo-only; does not change ledger or policy. */
export function blockedImpactStatus(events: UsageEvent[]): BlockedImpactStatus {
  const blocked = events.filter((e) => e.decision === "block");
  const assume = assumedTokens();
  const buckets = new Map<string, { blocks: number; avoided: number }>();
  let totalAvoided = 0;
  for (const e of blocked) {
    const model = e.model || "(none)";
    const price = priceFor(model);
    // Conservative: input tokens only, fixed assumption. Real blocks store zero tokens.
    const avoided = (assume / 1_000_000) * price.input;
    const b = buckets.get(model) ?? { blocks: 0, avoided: 0 };
    b.blocks += 1;
    b.avoided += avoided;
    buckets.set(model, b);
    totalAvoided += avoided;
  }
  const rows: BlockedImpactRow[] = [...buckets.entries()]
    .map(([model, b]) => ({
      model,
      blocks: b.blocks,
      estimatedAvoidedUsd: Math.round(b.avoided * 1e6) / 1e6,
      pct: blocked.length === 0 ? 0 : Math.round((b.blocks / blocked.length) * 1000) / 10,
    }))
    .sort((a, b) => b.blocks - a.blocks || a.model.localeCompare(b.model))
    .slice(0, TOP_N);
  return {
    version: "tokenpulse-blocked-impact-v1",
    totalBlocks: blocked.length,
    uniqueModels: buckets.size,
    estimatedAvoidedUsd: Math.round(totalAvoided * 1e6) / 1e6,
    assumedPromptTokens: assume,
    rows,
    notes: `Estimated avoided USD uses a fixed ${assume}-token prompt assumption × model input price on block events only. Blocks store zero real tokens. Demo/visibility only — not ledgered cost. No raw prompts.`,
  };
}
