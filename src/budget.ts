import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { readEvents } from "./ledger.js";

export const BudgetConfigSchema = z.object({
  defaultDailyUsd: z.number().nonnegative().optional(),
  defaultMonthlyUsd: z.number().nonnegative().optional(),
  teams: z
    .record(
      z.object({
        dailyUsd: z.number().nonnegative().optional(),
        monthlyUsd: z.number().nonnegative().optional(),
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
  period: "daily" | "monthly" | "none";
  policyId: string;
  reason?: string;
};

export function budgetsPath(): string {
  return process.env.TOKENPULSE_BUDGETS_PATH ?? join(process.cwd(), "data", "budgets.json");
}

export async function loadBudgets(): Promise<BudgetConfig> {
  const fromEnvDaily = process.env.TOKENPULSE_DEFAULT_DAILY_USD;
  const envDaily =
    fromEnvDaily !== undefined && fromEnvDaily !== "" ? Number(fromEnvDaily) : undefined;
  const fromEnvMonthly = process.env.TOKENPULSE_DEFAULT_MONTHLY_USD;
  const envMonthly =
    fromEnvMonthly !== undefined && fromEnvMonthly !== "" ? Number(fromEnvMonthly) : undefined;
  let fileCfg: BudgetConfig = {};
  try {
    const raw = await readFile(budgetsPath(), "utf8");
    const parsed = BudgetConfigSchema.safeParse(JSON.parse(raw));
    if (parsed.success) fileCfg = parsed.data;
  } catch {
    // missing file = no file-level caps
  }
  return {
    defaultDailyUsd:
      fileCfg.defaultDailyUsd ?? (Number.isFinite(envDaily) ? envDaily : undefined),
    defaultMonthlyUsd:
      fileCfg.defaultMonthlyUsd ?? (Number.isFinite(envMonthly) ? envMonthly : undefined),
    teams: fileCfg.teams,
  };
}

export function dailyCapForTeam(cfg: BudgetConfig, teamId: string): number | null {
  const teamCap = cfg.teams?.[teamId]?.dailyUsd;
  if (typeof teamCap === "number") return teamCap;
  if (typeof cfg.defaultDailyUsd === "number") return cfg.defaultDailyUsd;
  return null;
}

/** @deprecated use dailyCapForTeam */
export function capForTeam(cfg: BudgetConfig, teamId: string): number | null {
  return dailyCapForTeam(cfg, teamId);
}

export function monthlyCapForTeam(cfg: BudgetConfig, teamId: string): number | null {
  const teamCap = cfg.teams?.[teamId]?.monthlyUsd;
  if (typeof teamCap === "number") return teamCap;
  if (typeof cfg.defaultMonthlyUsd === "number") return cfg.defaultMonthlyUsd;
  return null;
}

function sumAllowed(events: Awaited<ReturnType<typeof readEvents>>, teamId: string): number {
  let spent = 0;
  for (const e of events) {
    if (e.teamId !== teamId) continue;
    if (e.decision !== "allow") continue;
    spent += e.estimatedCostUsd;
  }
  return Math.round(spent * 1_000_000) / 1_000_000;
}

export async function spentTodayUsd(teamId: string, now = new Date()): Promise<number> {
  const day = now.toISOString().slice(0, 10);
  const events = await readEvents({ day });
  return sumAllowed(
    events.filter((e) => e.timestamp.startsWith(day)),
    teamId,
  );
}

export async function spentThisMonthUsd(teamId: string, now = new Date()): Promise<number> {
  const month = now.toISOString().slice(0, 7);
  const events = await readEvents({ month });
  return sumAllowed(
    events.filter((e) => e.timestamp.startsWith(month)),
    teamId,
  );
}

export async function evaluateBudget(teamId: string, now = new Date()): Promise<BudgetDecision> {
  const cfg = await loadBudgets();
  const dailyCap = dailyCapForTeam(cfg, teamId);
  const monthlyCap = monthlyCapForTeam(cfg, teamId);
  const spentDaily = await spentTodayUsd(teamId, now);
  const spentMonthly = await spentThisMonthUsd(teamId, now);

  if (dailyCap !== null && spentDaily >= dailyCap) {
    return {
      allow: false,
      teamId,
      spentUsd: spentDaily,
      capUsd: dailyCap,
      period: "daily",
      policyId: "budget-daily-team",
      reason: `daily budget exceeded for team ${teamId}: spent ${spentDaily} >= cap ${dailyCap}`,
    };
  }

  if (monthlyCap !== null && spentMonthly >= monthlyCap) {
    return {
      allow: false,
      teamId,
      spentUsd: spentMonthly,
      capUsd: monthlyCap,
      period: "monthly",
      policyId: "budget-monthly-team",
      reason: `monthly budget exceeded for team ${teamId}: spent ${spentMonthly} >= cap ${monthlyCap}`,
    };
  }

  if (dailyCap !== null) {
    return {
      allow: true,
      teamId,
      spentUsd: spentDaily,
      capUsd: dailyCap,
      period: "daily",
      policyId: "budget-daily-team",
    };
  }
  if (monthlyCap !== null) {
    return {
      allow: true,
      teamId,
      spentUsd: spentMonthly,
      capUsd: monthlyCap,
      period: "monthly",
      policyId: "budget-monthly-team",
    };
  }
  return {
    allow: true,
    teamId,
    spentUsd: spentDaily,
    capUsd: null,
    period: "none",
    policyId: "budget-unlimited",
  };
}
