import type { UsageEvent } from "./types.js";
import { policyRoiStatus } from "./policyRoi.js";
import { summarize } from "./ledger.js";

export type OutreachSnippet = {
  version: "tokenpulse-outreach-snippet-v1";
  subjectHint: string;
  body: string;
  numbers: {
    allowedCostUsd: number;
    estimatedAvoidedUsd: number;
    avoidedPct: number;
    topTeam?: string;
    topTeamCostUsd?: number;
  };
  note: string;
};

/** Generates a short paragraph the operator can paste into personalized emails after the demo recording exists. Uses current ledger. No secrets. */
export function outreachSnippet(events: UsageEvent[]): OutreachSnippet {
  const roi = policyRoiStatus(events);
  const summary = summarize(events);
  const topTeam = Object.entries(summary.byTeam ?? {})
    .sort((a, b) => (b[1].costUsd ?? 0) - (a[1].costUsd ?? 0))[0];
  const topName = topTeam?.[0];
  const topCost = topTeam?.[1].costUsd;

  const body = `In a recent Tokenpulse pilot run, allowed model spend was $${roi.allowedCostUsd.toFixed(2)} while policy blocks (budget, rate, model, sensitive) are estimated to have avoided $${roi.estimatedAvoidedUsd.toFixed(2)} (${roi.avoidedPct}% of potential).${topName ? ` Top team was ${topName} at $${(topCost ?? 0).toFixed(2)}.` : ""} The gateway is self-hosted, OpenAI-compatible, and writes a hash-chained ledger with FinOps + CISO packs. No raw prompts stored by default. Happy to share the 3-minute mock demo recording.`;

  return {
    version: "tokenpulse-outreach-snippet-v1",
    subjectHint: "Self-hosted AI FinOps + policy blocks (demo numbers attached)",
    body,
    numbers: {
      allowedCostUsd: roi.allowedCostUsd,
      estimatedAvoidedUsd: roi.estimatedAvoidedUsd,
      avoidedPct: roi.avoidedPct,
      topTeam: topName,
      topTeamCostUsd: topCost,
    },
    note: "Paste into OUTREACH_DRAFTS.md after DEMO.md recording exists. Numbers are from the current ledger (seed or real). Not a commitment. No secrets.",
  };
}
