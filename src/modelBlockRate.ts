import type { UsageEvent } from "./types.js";

export type ModelBlockRateRow = {
  model: string;
  total: number;
  allowed: number;
  blocked: number;
  blockRate: number; // 0–1, rounded to 3 decimals
};

export type ModelBlockRateStatus = {
  version: "tokenpulse-model-block-rate-v1";
  uniqueModels: number;
  totalAttempts: number;
  totalBlocked: number;
  overallBlockRate: number;
  rows: ModelBlockRateRow[];
  notes: string;
};

const TOP_N = 12;

/** Rank models by block rate (blocked / total attempts). Visibility only. Includes all decisions except notes. No raw prompts. */
export function modelBlockRateStatus(events: UsageEvent[]): ModelBlockRateStatus {
  const relevant = events.filter((e) => e.decision === "allow" || e.decision === "block");
  const buckets = new Map<string, { total: number; allowed: number; blocked: number }>();
  let totalAttempts = 0;
  let totalBlocked = 0;
  for (const e of relevant) {
    const model = e.model || "(unknown)";
    const bucket = buckets.get(model) ?? { total: 0, allowed: 0, blocked: 0 };
    bucket.total += 1;
    if (e.decision === "allow") bucket.allowed += 1;
    else bucket.blocked += 1;
    buckets.set(model, bucket);
    totalAttempts += 1;
    if (e.decision === "block") totalBlocked += 1;
  }
  const rows: ModelBlockRateRow[] = [...buckets.entries()]
    .map(([model, b]) => ({
      model,
      total: b.total,
      allowed: b.allowed,
      blocked: b.blocked,
      blockRate: b.total === 0 ? 0 : Math.round((b.blocked / b.total) * 1000) / 1000,
    }))
    .sort((a, b) => b.blockRate - a.blockRate || b.blocked - a.blocked || a.model.localeCompare(b.model))
    .slice(0, TOP_N);
  const overall = totalAttempts === 0 ? 0 : Math.round((totalBlocked / totalAttempts) * 1000) / 1000;
  return {
    version: "tokenpulse-model-block-rate-v1",
    uniqueModels: buckets.size,
    totalAttempts,
    totalBlocked,
    overallBlockRate: overall,
    rows,
    notes:
      "Block rate by client model id (blocked / total allow+block attempts) in the selected window. Notes excluded. Visibility only — does not change policy. No raw prompts.",
  };
}
