import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { readEvents } from "./ledger.js";

export const BudgetConfigSchema = z.object({
  defaultDailyUsd: z.number().nonnegative().optional(),
  teams: z
    .record(
      z.object({
        dailyUsd: z.number().nonnegative(),
      }),
    )
    .optional(),
});

export type BudgetConfig = z.infer<typeof BudgetConfigSchema>;

export type BudgetDecision = {
  allow: boolean;
  teamId: string;
  spentUsd: number;
  capUsd: number | null;
  policyId: string;
  reason?: string;
};

export function budgetsPath(): string {
  return process.env.TOKENPULSE_BUDGETS_PATH ?? join(process.cwd(), "data", "budgets.json");
}

export async function loadBudgets(): Promise<BudgetConfig> {
  const fromEnv = process.env.TOKENPULSE_DEFAULT_DAILY_USD;
  const envDefault = fromEnv !== undefined && fromEnv !== "" ? Number(fromEnv) : undefined;
  let fileCfg: BudgetConfig = {};
  try {
    const raw = await readFile(budgetsPath(), "utf8");
    const parsed = BudgetConfigSchema.safeParse(JSON.parse(raw));
    if (parsed.success) fileCfg = parsed.data;
  } catch {
    // missing file = no file-level caps
  }
  return {
    defaultDailyUsd: fileCfg.defaultDailyUsd ?? (Number.isFinite(envDefault) ? envDefault : undefined),
    teams: fileCfg.teams,
  };
}

export function capForTeam(cfg: BudgetConfig, teamId: string): number | null {
  const teamCap = cfg.teams?.[teamId]?.dailyUsd;
  if (typeof teamCap === "number") return teamCap;
  if (typeof cfg.defaultDailyUsd === "number") return cfg.defaultDailyUsd;
  return null;
}

export async function spentTodayUsd(teamId: string, now = new Date()): Promise<number> {
  const day = now.toISOString().slice(0, 10);
  const events = await readEvents({ day });
  let spent = 0;
  for (const e of events) {
    if (e.teamId !== teamId) continue;
    if (e.decision !== "allow") continue;
    if (!e.timestamp.startsWith(day)) continue;
    spent += e.estimatedCostUsd;
  }
  return Math.round(spent * 1_000_000) / 1_000_000;
}

export async function evaluateBudget(teamId: string, now = new Date()): Promise<BudgetDecision> {
  const cfg = await loadBudgets();
  const capUsd = capForTeam(cfg, teamId);
  const spentUsd = await spentTodayUsd(teamId, now);
  if (capUsd === null) {
    return { allow: true, teamId, spentUsd, capUsd: null, policyId: "budget-unlimited" };
  }
  if (spentUsd >= capUsd) {
    return {
      allow: false,
      teamId,
      spentUsd,
      capUsd,
      policyId: "budget-daily-team",
      reason: `daily budget exceeded for team ${teamId}: spent ${spentUsd} >= cap ${capUsd}`,
    };
  }
  return { allow: true, teamId, spentUsd, capUsd, policyId: "budget-daily-team" };
}
