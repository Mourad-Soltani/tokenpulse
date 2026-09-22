import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { readEvents } from "./ledger.js";

const CapSchema = z.object({
  dailyUsd: z.number().nonnegative().optional(),
  monthlyUsd: z.number().nonnegative().optional(),
});

export const BudgetConfigSchema = z.object({
  defaultDailyUsd: z.number().nonnegative().optional(),
  defaultMonthlyUsd: z.number().nonnegative().optional(),
  teams: z.record(CapSchema).optional(),
  apps: z.record(CapSchema).optional(),
});

export type BudgetConfig = z.infer<typeof BudgetConfigSchema>;

export type BudgetDecision = {
  allow: boolean;
  teamId: string;
  appId: string;
  spentUsd: number;
  capUsd: number | null;
  period: "daily" | "monthly" | "none";
  scope: "team" | "app" | "none";
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
    apps: fileCfg.apps,
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

export function dailyCapForApp(cfg: BudgetConfig, appId: string): number | null {
  const cap = cfg.apps?.[appId]?.dailyUsd;
  return typeof cap === "number" ? cap : null;
}

export function monthlyCapForApp(cfg: BudgetConfig, appId: string): number | null {
  const cap = cfg.apps?.[appId]?.monthlyUsd;
  return typeof cap === "number" ? cap : null;
}

function sumAllowed(
  events: Awaited<ReturnType<typeof readEvents>>,
  pred: (e: Awaited<ReturnType<typeof readEvents>>[number]) => boolean,
): number {
  let spent = 0;
  for (const e of events) {
    if (e.decision !== "allow") continue;
    if (!pred(e)) continue;
    spent += e.estimatedCostUsd;
  }
  return Math.round(spent * 1_000_000) / 1_000_000;
}

export async function spentTodayUsd(teamId: string, now = new Date()): Promise<number> {
  const day = now.toISOString().slice(0, 10);
  const events = await readEvents({ day });
  return sumAllowed(
    events.filter((e) => e.timestamp.startsWith(day)),
    (e) => e.teamId === teamId,
  );
}

export async function spentThisMonthUsd(teamId: string, now = new Date()): Promise<number> {
  const month = now.toISOString().slice(0, 7);
  const events = await readEvents({ month });
  return sumAllowed(
    events.filter((e) => e.timestamp.startsWith(month)),
    (e) => e.teamId === teamId,
  );
}

export async function spentTodayAppUsd(appId: string, now = new Date()): Promise<number> {
  const day = now.toISOString().slice(0, 10);
  const events = await readEvents({ day });
  return sumAllowed(
    events.filter((e) => e.timestamp.startsWith(day)),
    (e) => e.appId === appId,
  );
}

export async function spentThisMonthAppUsd(appId: string, now = new Date()): Promise<number> {
  const month = now.toISOString().slice(0, 7);
  const events = await readEvents({ month });
  return sumAllowed(
    events.filter((e) => e.timestamp.startsWith(month)),
    (e) => e.appId === appId,
  );
}

export async function evaluateBudget(
  teamId: string,
  appId = "default",
  now = new Date(),
): Promise<BudgetDecision> {
  const cfg = await loadBudgets();
  const dailyCap = dailyCapForTeam(cfg, teamId);
  const monthlyCap = monthlyCapForTeam(cfg, teamId);
  const appDailyCap = dailyCapForApp(cfg, appId);
  const appMonthlyCap = monthlyCapForApp(cfg, appId);
  const spentDaily = await spentTodayUsd(teamId, now);
  const spentMonthly = await spentThisMonthUsd(teamId, now);
  const spentAppDaily = await spentTodayAppUsd(appId, now);
  const spentAppMonthly = await spentThisMonthAppUsd(appId, now);

  if (dailyCap !== null && spentDaily >= dailyCap) {
    return {
      allow: false,
      teamId,
      appId,
      spentUsd: spentDaily,
      capUsd: dailyCap,
      period: "daily",
      scope: "team",
      policyId: "budget-daily-team",
      reason: `daily budget exceeded for team ${teamId}: spent ${spentDaily} >= cap ${dailyCap}`,
    };
  }

  if (monthlyCap !== null && spentMonthly >= monthlyCap) {
    return {
      allow: false,
      teamId,
      appId,
      spentUsd: spentMonthly,
      capUsd: monthlyCap,
      period: "monthly",
      scope: "team",
      policyId: "budget-monthly-team",
      reason: `monthly budget exceeded for team ${teamId}: spent ${spentMonthly} >= cap ${monthlyCap}`,
    };
  }

  if (appDailyCap !== null && spentAppDaily >= appDailyCap) {
    return {
      allow: false,
      teamId,
      appId,
      spentUsd: spentAppDaily,
      capUsd: appDailyCap,
      period: "daily",
      scope: "app",
      policyId: "budget-daily-app",
      reason: `daily budget exceeded for app ${appId}: spent ${spentAppDaily} >= cap ${appDailyCap}`,
    };
  }

  if (appMonthlyCap !== null && spentAppMonthly >= appMonthlyCap) {
    return {
      allow: false,
      teamId,
      appId,
      spentUsd: spentAppMonthly,
      capUsd: appMonthlyCap,
      period: "monthly",
      scope: "app",
      policyId: "budget-monthly-app",
      reason: `monthly budget exceeded for app ${appId}: spent ${spentAppMonthly} >= cap ${appMonthlyCap}`,
    };
  }

  if (dailyCap !== null) {
    return {
      allow: true,
      teamId,
      appId,
      spentUsd: spentDaily,
      capUsd: dailyCap,
      period: "daily",
      scope: "team",
      policyId: "budget-daily-team",
    };
  }
  if (monthlyCap !== null) {
    return {
      allow: true,
      teamId,
      appId,
      spentUsd: spentMonthly,
      capUsd: monthlyCap,
      period: "monthly",
      scope: "team",
      policyId: "budget-monthly-team",
    };
  }
  if (appDailyCap !== null) {
    return {
      allow: true,
      teamId,
      appId,
      spentUsd: spentAppDaily,
      capUsd: appDailyCap,
      period: "daily",
      scope: "app",
      policyId: "budget-daily-app",
    };
  }
  if (appMonthlyCap !== null) {
    return {
      allow: true,
      teamId,
      appId,
      spentUsd: spentAppMonthly,
      capUsd: appMonthlyCap,
      period: "monthly",
      scope: "app",
      policyId: "budget-monthly-app",
    };
  }
  return {
    allow: true,
    teamId,
    appId,
    spentUsd: spentDaily,
    capUsd: null,
    period: "none",
    scope: "none",
    policyId: "budget-unlimited",
  };
}

/** Fraction of cap at which status flips to warn (default 0.8). */
export function budgetWarnRatio(): number {
  const raw = process.env.TOKENPULSE_BUDGET_WARN_RATIO;
  if (raw === undefined || raw === "") return 0.8;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 1) return 0.8;
  return n;
}

export type BudgetStatusRow = {
  scope: "team" | "app";
  id: string;
  period: "daily" | "monthly";
  spentUsd: number;
  capUsd: number;
  remainingUsd: number;
  ratio: number;
  warn: boolean;
  exhausted: boolean;
};

function statusRow(
  scope: "team" | "app",
  id: string,
  period: "daily" | "monthly",
  spentUsd: number,
  capUsd: number,
  warnRatio: number,
): BudgetStatusRow {
  const remainingUsd = Math.max(0, Math.round((capUsd - spentUsd) * 1_000_000) / 1_000_000);
  const ratio = capUsd === 0 ? 1 : Math.round((spentUsd / capUsd) * 10_000) / 10_000;
  const exhausted = spentUsd >= capUsd;
  return {
    scope,
    id,
    period,
    spentUsd,
    capUsd,
    remainingUsd,
    ratio,
    warn: exhausted || ratio >= warnRatio,
    exhausted,
  };
}

/**
 * Operator view of configured caps vs current spend.
 * Only rows with an explicit or default team/app cap are included.
 */
export async function budgetStatus(now = new Date()): Promise<BudgetStatusRow[]> {
  const cfg = await loadBudgets();
  const warnRatio = budgetWarnRatio();
  const rows: BudgetStatusRow[] = [];
  const teamIds = new Set<string>(Object.keys(cfg.teams ?? {}));
  if (typeof cfg.defaultDailyUsd === "number" || typeof cfg.defaultMonthlyUsd === "number") {
    // Defaults apply to any team that appears in today's ledger, plus named teams.
    const day = now.toISOString().slice(0, 10);
    const events = await readEvents({ day });
    for (const e of events) teamIds.add(e.teamId);
  }
  for (const teamId of [...teamIds].sort()) {
    const dailyCap = dailyCapForTeam(cfg, teamId);
    if (dailyCap !== null) {
      const spent = await spentTodayUsd(teamId, now);
      rows.push(statusRow("team", teamId, "daily", spent, dailyCap, warnRatio));
    }
    const monthlyCap = monthlyCapForTeam(cfg, teamId);
    if (monthlyCap !== null) {
      const spent = await spentThisMonthUsd(teamId, now);
      rows.push(statusRow("team", teamId, "monthly", spent, monthlyCap, warnRatio));
    }
  }
  for (const appId of Object.keys(cfg.apps ?? {}).sort()) {
    const dailyCap = dailyCapForApp(cfg, appId);
    if (dailyCap !== null) {
      const spent = await spentTodayAppUsd(appId, now);
      rows.push(statusRow("app", appId, "daily", spent, dailyCap, warnRatio));
    }
    const monthlyCap = monthlyCapForApp(cfg, appId);
    if (monthlyCap !== null) {
      const spent = await spentThisMonthAppUsd(appId, now);
      rows.push(statusRow("app", appId, "monthly", spent, monthlyCap, warnRatio));
    }
  }
  return rows;
}
