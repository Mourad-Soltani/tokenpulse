import type { BudgetStatusRow } from "./budget.js";

export type BurnRateRow = {
  scope: "team" | "app";
  id: string;
  period: "daily";
  spentUsd: number;
  capUsd: number;
  hoursElapsed: number;
  projectedUsd: number;
  projectedRatio: number;
  willExhaust: boolean;
};

export type BurnRateStatus = {
  version: "tokenpulse-burn-v1";
  day: string;
  hoursElapsed: number;
  rows: BurnRateRow[];
  exhaustWarnCount: number;
  notes: string;
};

export function hoursElapsedUtc(now: Date): number {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const ms = now.getTime() - start;
  return Math.max(0.05, Math.round((ms / 3_600_000) * 100) / 100);
}

/** Pure projection. Operator visibility only — does not change hard caps. */
export function projectBurnRate(budgets: BudgetStatusRow[], now = new Date()): BurnRateStatus {
  const hours = hoursElapsedUtc(now);
  const factor = 24 / hours;
  const rows: BurnRateRow[] = budgets
    .filter((b) => b.period === "daily" && b.capUsd > 0)
    .map((b) => {
      const projected = Math.round(b.spentUsd * factor * 1_000_000) / 1_000_000;
      const ratio = Math.round((projected / b.capUsd) * 10_000) / 10_000;
      return {
        scope: b.scope,
        id: b.id,
        period: "daily" as const,
        spentUsd: b.spentUsd,
        capUsd: b.capUsd,
        hoursElapsed: hours,
        projectedUsd: projected,
        projectedRatio: ratio,
        willExhaust: projected >= b.capUsd,
      };
    });
  return {
    version: "tokenpulse-burn-v1",
    day: now.toISOString().slice(0, 10),
    hoursElapsed: hours,
    rows,
    exhaustWarnCount: rows.filter((r) => r.willExhaust).length,
    notes: "Linear projection of today's allowed spend to 24h UTC. Does not change hard caps.",
  };
}

/** Convenience wrapper used by adminSummary. */
export async function burnRateStatus(now = new Date()): Promise<BurnRateStatus> {
  const { budgetStatus } = await import("./budget.js");
  const budgets = await budgetStatus(now);
  return projectBurnRate(budgets, now);
}
