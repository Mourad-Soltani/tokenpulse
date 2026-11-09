import type { UsageEvent } from "./types.js";
import { policyRoiStatus } from "./policyRoi.js";
import { summarize } from "./ledger.js";
import { demoReadyStatus } from "./demoReady.js";

export type BuyerBrief = {
  version: "tokenpulse-buyer-brief-v1";
  headline: string;
  bullets: string[];
  numbers: {
    allowedCostUsd: number;
    estimatedAvoidedUsd: number;
    avoidedPct: number;
    allowCount: number;
    blockCount: number;
    uniqueTeams: number;
    uniqueModels: number;
  };
  positioning: string;
  nextStep: string;
  note: string;
};

/** Concise executive brief for buyer calls / teaser follow-up. Visibility only. Uses current ledger. */
export function buyerBrief(events: UsageEvent[]): BuyerBrief {
  const roi = policyRoiStatus(events);
  const summary = summarize(events);
  const ready = demoReadyStatus(events);

  const allowCount = events.filter((e) => e.decision === "allow").length;
  const blockCount = events.filter((e) => e.decision === "block").length;
  const uniqueTeams = Object.keys(summary.byTeam ?? {}).length;
  const uniqueModels = Object.keys(summary.byModel ?? {}).length;

  const headline = `Tokenpulse pilot: $${roi.allowedCostUsd.toFixed(2)} allowed / $${roi.estimatedAvoidedUsd.toFixed(2)} estimated avoided (${roi.avoidedPct}% policy ROI)`;

  const bullets = [
    `Self-hosted OpenAI-compatible gateway (chat + embeddings + SSE).`,
    `Hash-chained ledger, no raw prompts by default, FinOps + CISO audit packs.`,
    `Budget / rate / model / sensitive / size policy before egress. Multi-upstream + remap.`,
    `Admin dashboard + Prometheus metrics + CLI. Client keys, correlation ids, discovery signals.`,
    ready.ready
      ? `Demo ledger is rich enough for recording (${allowCount} allows, ${blockCount} blocks).`
      : `Seed the demo ledger for richer numbers before the call.`,
  ];

  return {
    version: "tokenpulse-buyer-brief-v1",
    headline,
    bullets,
    numbers: {
      allowedCostUsd: roi.allowedCostUsd,
      estimatedAvoidedUsd: roi.estimatedAvoidedUsd,
      avoidedPct: roi.avoidedPct,
      allowCount,
      blockCount,
      uniqueTeams,
      uniqueModels,
    },
    positioning:
      "Private AI FinOps + shadow-AI control plane. Meter, attribute, enforce, export. Adjacent to Portkey/TRiSM; self-host first. Not a workflow orchestrator.",
    nextStep: "Record 3-min mock DEMO.md (no keys on camera). Then personalize ≤10 emails from OUTREACH_DRAFTS.md.",
    note: "Generated from current ledger (seed or real). Numbers are estimates for demo. No secrets. Not a commitment.",
  };
}
