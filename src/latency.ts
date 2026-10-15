import type { UsageEvent } from "./types.js";

export type LatencyStatus = {
  version: "tokenpulse-latency-v1";
  samples: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  notes: string;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

/** Operator visibility only — does not change routing or block policy. Notes are excluded. */
export function latencyStatus(events: UsageEvent[]): LatencyStatus {
  const samples = events
    .filter((e) => e.decision !== "note" && Number.isFinite(e.latencyMs))
    .map((e) => e.latencyMs)
    .sort((a, b) => a - b);
  const sum = samples.reduce((a, b) => a + b, 0);
  const avg = samples.length ? sum / samples.length : 0;
  return {
    version: "tokenpulse-latency-v1",
    samples: samples.length,
    avgMs: Math.round(avg * 10) / 10,
    p50Ms: percentile(samples, 50),
    p95Ms: percentile(samples, 95),
    maxMs: samples.length ? samples[samples.length - 1]! : 0,
    notes: "Computed from non-note ledger events in the selected window. No raw prompts.",
  };
}
