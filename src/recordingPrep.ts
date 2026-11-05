import { summarize } from "./ledger.js";
import { teamSpendStatus } from "./teamSpend.js";
import { modelSpendStatus } from "./modelSpend.js";
import { blockedImpactStatus } from "./blockedImpact.js";
import { appSpendStatus } from "./appSpend.js";
import type { UsageEvent } from "./types.js";

/** Concise numbers the operator can mention while recording DEMO.md. */
export function recordingPrep(events: UsageEvent[]): {
  totalAllowedUsd: number;
  totalBlockedImpactUsd: number;
  topTeam: { id: string; usd: number } | null;
  topModel: { id: string; usd: number } | null;
  topApp: { id: string; usd: number } | null;
  allowCount: number;
  blockCount: number;
  note: string;
} {
  const summary = summarize(events);
  const teams = teamSpendStatus(events).rows ?? [];
  const models = modelSpendStatus(events).rows ?? [];
  const apps = appSpendStatus(events).rows ?? [];
  const impact = blockedImpactStatus(events);
  const topTeam = teams[0] ? { id: teams[0].teamId, usd: teams[0].costUsd } : null;
  const topModel = models[0] ? { id: models[0].model, usd: models[0].costUsd } : null;
  const topApp = apps[0] ? { id: apps[0].appId, usd: apps[0].costUsd } : null;
  return {
    totalAllowedUsd: Math.round((summary.costUsd ?? 0) * 1e6) / 1e6,
    totalBlockedImpactUsd: impact.estimatedAvoidedUsd ?? 0,
    topTeam,
    topModel,
    topApp,
    allowCount: summary.allowed ?? 0,
    blockCount: summary.blocked ?? 0,
    note: events.length === 0
      ? "Ledger empty. Run: TOKENPULSE_LEDGER_DIR=data/ledger-seed npx tsx src/cli.ts --seed-demo"
      : "Synthetic or live ledger ready for recording. No raw prompts stored.",
  };
}
