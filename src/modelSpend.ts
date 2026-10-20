import type { UsageEvent } from "./types.js";

export type ModelSpendRow = {
  model: string;
  calls: number;
  tokens: number;
  costUsd: number;
  percent: number;
};

export type ModelSpendStatus = {
  version: "tokenpulse-model-spend-v1";
  totalCostUsd: number;
  uniqueModels: number;
  rows: ModelSpendRow[];
  notes: string;
};

const TOP_N = 12;

/** Operator visibility of estimated spend by model. Allowed events only. Does not change pricing or policy. */
export function modelSpendStatus(events: UsageEvent[]): ModelSpendStatus {
  const allowed = events.filter((e) => e.decision === "allow");
  const buckets = new Map<string, { calls: number; tokens: number; costUsd: number }>();
  let totalCost = 0;
  for (const e of allowed) {
    const model = e.model || "(unknown)";
    const bucket = buckets.get(model) ?? { calls: 0, tokens: 0, costUsd: 0 };
    bucket.calls += 1;
    bucket.tokens += e.totalTokens ?? 0;
    bucket.costUsd += e.estimatedCostUsd ?? 0;
    buckets.set(model, bucket);
    totalCost += e.estimatedCostUsd ?? 0;
  }
  const rows: ModelSpendRow[] = [...buckets.entries()]
    .map(([model, b]) => ({
      model,
      calls: b.calls,
      tokens: b.tokens,
      costUsd: Math.round(b.costUsd * 1e6) / 1e6,
      percent: totalCost === 0 ? 0 : Math.round((b.costUsd / totalCost) * 1000) / 10,
    }))
    .sort((a, b) => b.costUsd - a.costUsd || a.model.localeCompare(b.model))
    .slice(0, TOP_N);
  return {
    version: "tokenpulse-model-spend-v1",
    totalCostUsd: Math.round(totalCost * 1e6) / 1e6,
    uniqueModels: buckets.size,
    rows,
    notes: "Estimated USD spend by client model id on allowed events in the selected window. Notes and blocks excluded. No raw prompts.",
  };
}
