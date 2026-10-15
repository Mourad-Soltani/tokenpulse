import type { UsageEvent } from "./types.js";

export type UpstreamHealthStatus = {
  version: "tokenpulse-upstream-health-v1";
  samples: number;
  successes: number;
  failures: number;
  successRate: number;
  notes: string;
};

/** Operator visibility for upstream outcomes. Does not change routing or policy. Notes excluded. */
export function upstreamHealthStatus(events: UsageEvent[]): UpstreamHealthStatus {
  const relevant = events.filter((e) => e.decision !== "note");
  const failures = relevant.filter((e) => e.policyIds.includes("upstream_error")).length;
  const successes = relevant.filter((e) => e.decision === "allow").length;
  const samples = successes + failures;
  const rate = samples === 0 ? 1 : successes / samples;
  return {
    version: "tokenpulse-upstream-health-v1",
    samples,
    successes,
    failures,
    successRate: Math.round(rate * 1000) / 10, // one decimal percent
    notes: "Success = allow. Failure = block with upstream_error. Computed from non-note ledger events. No raw prompts.",
  };
}
