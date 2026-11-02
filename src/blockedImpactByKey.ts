import type { UsageEvent } from "./types.js";
import { priceFor } from "./pricing.js";

export type BlockedImpactByKeyRow = {
  keyId: string;
  blocks: number;
  estimatedAvoidedUsd: number;
  pct: number;
};

export type BlockedImpactByKeyStatus = {
  version: "tokenpulse-blocked-impact-by-key-v1";
  totalBlocks: number;
  uniqueKeys: number;
  estimatedAvoidedUsd: number;
  assumedPromptTokens: number;
  rows: BlockedImpactByKeyRow[];
  notes: string;
};

function assumedTokens(): number {
  const raw = process.env.TOKENPULSE_BLOCKED_ASSUME_TOKENS;
  const n = raw ? Number(raw) : 256;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 256;
}

function keyOf(e: UsageEvent): string {
  const ids = e.policyIds ?? [];
  for (const p of ids) {
    if (p.startsWith("key:")) {
      const id = p.slice("key:".length).trim();
      if (id) return id;
    }
  }
  return "gateway"; // operator path or unbound
}

/** Estimated avoided USD by client key on blocked requests (fixed prompt-token assumption). Visibility only. */
export function blockedImpactByKeyStatus(events: UsageEvent[], top = 12): BlockedImpactByKeyStatus {
  const blocked = events.filter((e) => e.decision === "block");
  const assume = assumedTokens();
  const buckets = new Map<string, { blocks: number; avoided: number }>();
  let totalAvoided = 0;
  for (const e of blocked) {
    const kid = keyOf(e);
    const model = e.model || "(none)";
    const price = priceFor(model);
    const avoided = (assume / 1_000_000) * price.input;
    const b = buckets.get(kid) ?? { blocks: 0, avoided: 0 };
    b.blocks += 1;
    b.avoided += avoided;
    buckets.set(kid, b);
    totalAvoided += avoided;
  }
  const rows: BlockedImpactByKeyRow[] = [...buckets.entries()]
    .map(([keyId, b]) => ({
      keyId,
      blocks: b.blocks,
      estimatedAvoidedUsd: Math.round(b.avoided * 1e6) / 1e6,
      pct: blocked.length === 0 ? 0 : Math.round((b.blocks / blocked.length) * 1000) / 10,
    }))
    .sort((a, b) => b.estimatedAvoidedUsd - a.estimatedAvoidedUsd || b.blocks - a.blocks)
    .slice(0, top);
  return {
    version: "tokenpulse-blocked-impact-by-key-v1",
    totalBlocks: blocked.length,
    uniqueKeys: buckets.size,
    estimatedAvoidedUsd: Math.round(totalAvoided * 1e6) / 1e6,
    assumedPromptTokens: assume,
    rows,
    notes: `Estimated avoided USD by client key (policy id key:<id> or gateway) using a fixed ${assume}-token prompt assumption × model input price on block events only. Blocks store zero real tokens. Demo/visibility only — not ledgered cost. No raw prompts or digests.`,
  };
}
