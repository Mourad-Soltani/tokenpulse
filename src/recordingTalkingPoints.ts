import type { UsageEvent } from "./types.js";
import { demoReadyStatus } from "./demoReady.js";
import { scaleModelStatus } from "./scaleModel.js";

export type RecordingTalkingPoints = {
  version: "tokenpulse-recording-talking-points-v1";
  ready: boolean;
  scaleModel: {
    targetMonthlyRequests: number;
    observedBlockRate: number;
    projectedMonthlyAvoidedUsd: number;
    projectedAnnualAvoidedUsd: number;
    assumptions: string[];
  };
  script: string[];
  cfoLine: string;
  note: string;
};

/** Short, ready-to-read talking points for the operator while recording DEMO.md.
 * Visibility only. Incorporates the transparent scale model so the four assumptions
 * are stated on camera. Does not change policy, metering, or storage. */
export function recordingTalkingPoints(
  events: UsageEvent[],
  opts?: { monthlyRequests?: number }
): RecordingTalkingPoints {
  const ready = demoReadyStatus(events);
  const scale = scaleModelStatus(events, { monthlyRequests: opts?.monthlyRequests });

  const ratePct = (scale.observedBlockRate * 100).toFixed(1);
  const annual = scale.projectedAnnualAvoidedUsd.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
  const monthly = scale.projectedMonthlyAvoidedUsd.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
  const target = scale.targetMonthlyRequests.toLocaleString();

  const script = [
    "Tokenpulse is a self-hosted OpenAI-compatible gateway. Clients point baseURL here; we meter, attribute, and enforce policy before any provider call.",
    "No raw prompts are stored by default. The ledger is hash-chained. FinOps and CISO packs export from the same events.",
    `Current window: ${ready.allowCount} allowed, ${ready.blockCount} blocked across ${ready.uniqueTeams} teams and ${ready.uniqueModels} models.`,
    `Scale model (transparent projection, not a ledger fact): at ${target} requests per month, the observed ${ratePct}% block rate projects roughly $${monthly} monthly / $${annual} annual avoided.`,
    "Four assumptions — always state these: (1) observed block rate is representative, (2) average cost of an allowed request is a reasonable proxy for a blocked request that would have been allowed, (3) target volume is operator-chosen, not derived from the ledger, (4) linear only — no seasonality or mix shift.",
    "The fixed-token avoided-$ numbers elsewhere are demo visibility only. Use the scale model and the four assumptions when discussing avoided spend with a CFO.",
  ];

  const cfoLine = `At ${target} requests/month the observed ${ratePct}% block rate projects ~$${annual} annual avoided. This is a transparent linear projection; the four assumptions are listed in SCALE.md.`;

  return {
    version: "tokenpulse-recording-talking-points-v1",
    ready: ready.ready,
    scaleModel: {
      targetMonthlyRequests: scale.targetMonthlyRequests,
      observedBlockRate: scale.observedBlockRate,
      projectedMonthlyAvoidedUsd: scale.projectedMonthlyAvoidedUsd,
      projectedAnnualAvoidedUsd: scale.projectedAnnualAvoidedUsd,
      assumptions: scale.assumptions,
    },
    script,
    cfoLine,
    note: "Generated from current ledger (seed or real). Scale model is a projection, not a ledger fact. State the four assumptions on camera. No secrets. Not a commitment.",
  };
}
