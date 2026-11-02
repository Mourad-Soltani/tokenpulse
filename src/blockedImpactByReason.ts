import type { UsageEvent } from "./types.js";
import { priceFor } from "./pricing.js";

export type BlockedImpactByReasonRow = {
  policyId: string;
  blocks: number;
  estimatedAvoidedUsd: number;
  pct: number;
};

export type BlockedImpactByReasonStatus = {
  version: "tokenpulse-blocked-impact-by-reason-v1";
  totalBlocks: number;
  uniquePolicies: number;
  estimatedAvoidedUsd: number;
  assumedPromptTokens: number;
  rows: BlockedImpactByReasonRow[];
  notes: string;
};

function assumedTokens(): number {
  const raw = process.env.TOKENPULSE_BLOCKED_ASSUME_TOKENS;
  const n = raw ? Number(raw) : 256;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 256;
}

/** Primary policy id on a block event (first non-empty policyIds entry, or "(none)"). */
function reasonOf(e: UsageEvent): string {
  const ids = e.policyIds ?? [];
  for (const p of ids) {
    const id = p.trim();
    if (id) return id;
  }
  return "(none)";
}

/** Estimated avoided USD by primary policy reason on blocked requests (fixed prompt-token assumption). Visibility only. */
export function blockedImpactByReasonStatus(events: UsageEvent[], top = 12): BlockedImpactByReasonStatus {
  const blocked = events.filter((e) => e.decision === "block");
  const assume = assumedTokens();
  const buckets = new Map<string, { blocks: number; avoided: number }>();
  let totalAvoided = 0;
  for (const e of blocked) {
    const reason = reasonOf(e);
    const model = e.model || "(none)";
    const price = priceFor(model);
    const avoided = (assume / 1_000_000) * price.input;
    const b = buckets.get(reason) ?? { blocks: 0, avoided: 0 };
    b.blocks += 1;
    b.avoided += avoided;
    buckets.set(reason, b);
    totalAvoided += avoided;
  }
  const rows: BlockedImpactByReasonRow[] = [...buckets.entries()]
    .map(([policyId, b]) => ({
      policyId,
      blocks: b.blocks,
      estimatedAvoidedUsd: Math.round(b.avoided * 1e6) / 1e6,
      pct: blocked.length === 0 ? 0 : Math.round((b.blocks / blocked.length) * 1000) / 10,
    }))
    .sort((a, b) => b.estimatedAvoidedUsd - a.estimatedAvoidedUsd || b.blocks - a.blocks)
    .slice(0, top);
  return {
    version: "tokenpulse-blocked-impact-by-reason-v1",
    totalBlocks: blocked.length,
    uniquePolicies: buckets.size,
    estimatedAvoidedUsd: Math.round(totalAvoided * 1e6) / 1e6,
    assumedPromptTokens: assume,
    rows,
    notes: `Estimated avoided USD by primary policy reason (first policyId on each block event) using a fixed ${assume}-token prompt assumption × model input price on block events only. Blocks store zero real tokens. Demo/visibility only — not ledgered cost. No raw prompts.`,
  };
}
