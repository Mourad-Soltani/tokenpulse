import type { UsageEvent } from "./types.js";
import { priceFor } from "./pricing.js";

export type BlockedImpactByTeamRow = {
  teamId: string;
  blocks: number;
  estimatedAvoidedUsd: number;
  pct: number;
};

export type BlockedImpactByTeamStatus = {
  version: "tokenpulse-blocked-impact-by-team-v1";
  totalBlocks: number;
  uniqueTeams: number;
  estimatedAvoidedUsd: number;
  assumedPromptTokens: number;
  rows: BlockedImpactByTeamRow[];
  notes: string;
};

function assumedTokens(): number {
  const raw = process.env.TOKENPULSE_BLOCKED_ASSUME_TOKENS;
  const n = raw ? Number(raw) : 256;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 256;
}

/** Estimated avoided USD by team on blocked requests (fixed prompt-token assumption). Visibility only. */
export function blockedImpactByTeamStatus(events: UsageEvent[], top = 12): BlockedImpactByTeamStatus {
  const blocked = events.filter((e) => e.decision === "block");
  const assume = assumedTokens();
  const buckets = new Map<string, { blocks: number; avoided: number }>();
  let totalAvoided = 0;
  for (const e of blocked) {
    const team = e.teamId || "default";
    const model = e.model || "(none)";
    const price = priceFor(model);
    const avoided = (assume / 1_000_000) * price.input;
    const b = buckets.get(team) ?? { blocks: 0, avoided: 0 };
    b.blocks += 1;
    b.avoided += avoided;
    buckets.set(team, b);
    totalAvoided += avoided;
  }
  const rows: BlockedImpactByTeamRow[] = [...buckets.entries()]
    .map(([teamId, b]) => ({
      teamId,
      blocks: b.blocks,
      estimatedAvoidedUsd: Math.round(b.avoided * 1e6) / 1e6,
      pct: blocked.length === 0 ? 0 : Math.round((b.blocks / blocked.length) * 1000) / 10,
    }))
    .sort((a, b) => b.estimatedAvoidedUsd - a.estimatedAvoidedUsd || b.blocks - a.blocks)
    .slice(0, top);
  return {
    version: "tokenpulse-blocked-impact-by-team-v1",
    totalBlocks: blocked.length,
    uniqueTeams: buckets.size,
    estimatedAvoidedUsd: Math.round(totalAvoided * 1e6) / 1e6,
    assumedPromptTokens: assume,
    rows,
    notes: `Estimated avoided USD by team using a fixed ${assume}-token prompt assumption × model input price on block events only. Blocks store zero real tokens. Demo/visibility only — not ledgered cost. No raw prompts.`,
  };
}
