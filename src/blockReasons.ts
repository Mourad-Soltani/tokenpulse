import type { UsageEvent } from "./types.js";

export type BlockReasonRow = {
  policyId: string;
  count: number;
  percent: number;
};

export type BlockReasonsStatus = {
  version: "tokenpulse-block-reasons-v1";
  totalBlocks: number;
  uniquePolicies: number;
  rows: BlockReasonRow[];
  notes: string;
};

const TOP_N = 12;

/** Operator visibility of why requests were blocked. Does not change policy. Notes excluded. */
export function blockReasonsStatus(events: UsageEvent[]): BlockReasonsStatus {
  const blocked = events.filter((e) => e.decision === "block");
  const counts = new Map<string, number>();
  for (const e of blocked) {
    const ids = e.policyIds.length ? e.policyIds : ["(none)"];
    for (const id of ids) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const total = blocked.length;
  const rows: BlockReasonRow[] = [...counts.entries()]
    .map(([policyId, count]) => ({
      policyId,
      count,
      percent: total === 0 ? 0 : Math.round((count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count || a.policyId.localeCompare(b.policyId))
    .slice(0, TOP_N);
  return {
    version: "tokenpulse-block-reasons-v1",
    totalBlocks: total,
    uniquePolicies: counts.size,
    rows,
    notes: "Counts of policyIds on block events in the selected window. A single event may contribute to multiple rows. No raw prompts.",
  };
}
