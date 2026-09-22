import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendEvent, newEvent } from "../src/ledger.ts";
import { capForTeam, dailyCapForApp, evaluateBudget, loadBudgets } from "../src/budget.ts";

describe("budget", () => {
  before(async () => {
    const dir = await mkdtemp(join(tmpdir(), "tp-budget-"));
    process.env.TOKENPULSE_LEDGER_DIR = dir;
    process.env.TOKENPULSE_BUDGETS_PATH = join(dir, "budgets.json");
    delete process.env.TOKENPULSE_DEFAULT_DAILY_USD;
    await writeFile(
      process.env.TOKENPULSE_BUDGETS_PATH,
      JSON.stringify({
        defaultDailyUsd: 1,
        teams: { tight: { dailyUsd: 0 } },
        apps: { capped: { dailyUsd: 0 } },
      }),
      "utf8",
    );
  });

  it("loads caps from file", async () => {
    const cfg = await loadBudgets();
    assert.equal(capForTeam(cfg, "tight"), 0);
    assert.equal(capForTeam(cfg, "other"), 1);
    assert.equal(dailyCapForApp(cfg, "capped"), 0);
    assert.equal(dailyCapForApp(cfg, "open"), null);
  });

  it("blocks when team daily cap is 0", async () => {
    const d = await evaluateBudget("tight");
    assert.equal(d.allow, false);
    assert.equal(d.policyId, "budget-daily-team");
    assert.equal(d.scope, "team");
    assert.equal(d.capUsd, 0);
  });

  it("blocks after allowed spend reaches cap", async () => {
    await appendEvent(
      newEvent({
        teamId: "other",
        appId: "bot",
        model: "gpt-4o-mini",
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
        estimatedCostUsd: 1,
        latencyMs: 1,
        decision: "allow",
        policyIds: ["seed"],
      }),
    );
    const d = await evaluateBudget("other");
    assert.equal(d.allow, false);
    assert.ok(d.spentUsd >= 1);
  });

  it("blocks when app daily cap is 0 even if team has room", async () => {
    const d = await evaluateBudget("fresh-team", "capped");
    assert.equal(d.allow, false);
    assert.equal(d.policyId, "budget-daily-app");
    assert.equal(d.scope, "app");
    assert.equal(d.period, "daily");
    assert.equal(d.capUsd, 0);
  });
});

describe("budget monthly", () => {
  it("blocks when monthly cap is exhausted even if daily remains", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tp-budget-m-"));
    process.env.TOKENPULSE_LEDGER_DIR = dir;
    process.env.TOKENPULSE_BUDGETS_PATH = join(dir, "budgets.json");
    delete process.env.TOKENPULSE_DEFAULT_DAILY_USD;
    delete process.env.TOKENPULSE_DEFAULT_MONTHLY_USD;
    await writeFile(
      process.env.TOKENPULSE_BUDGETS_PATH,
      JSON.stringify({
        teams: { monthly: { dailyUsd: 100, monthlyUsd: 2 } },
      }),
      "utf8",
    );
    const earlier = new Date();
    earlier.setUTCDate(1);
    earlier.setUTCHours(1, 0, 0, 0);
    await appendEvent(
      newEvent({
        timestamp: earlier.toISOString(),
        teamId: "monthly",
        appId: "bot",
        model: "gpt-4o-mini",
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
        estimatedCostUsd: 2,
        latencyMs: 1,
        decision: "allow",
        policyIds: ["seed-month"],
      }),
    );
    const d = await evaluateBudget("monthly");
    assert.equal(d.allow, false);
    assert.equal(d.policyId, "budget-monthly-team");
    assert.equal(d.period, "monthly");
    assert.ok(d.spentUsd >= 2);
  });

  it("blocks when app monthly cap is exhausted", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tp-budget-am-"));
    process.env.TOKENPULSE_LEDGER_DIR = dir;
    process.env.TOKENPULSE_BUDGETS_PATH = join(dir, "budgets.json");
    delete process.env.TOKENPULSE_DEFAULT_DAILY_USD;
    delete process.env.TOKENPULSE_DEFAULT_MONTHLY_USD;
    await writeFile(
      process.env.TOKENPULSE_BUDGETS_PATH,
      JSON.stringify({
        apps: { research: { dailyUsd: 100, monthlyUsd: 1 } },
      }),
      "utf8",
    );
    const earlier = new Date();
    earlier.setUTCDate(1);
    earlier.setUTCHours(1, 0, 0, 0);
    await appendEvent(
      newEvent({
        timestamp: earlier.toISOString(),
        teamId: "eng",
        appId: "research",
        model: "gpt-4o-mini",
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
        estimatedCostUsd: 1,
        latencyMs: 1,
        decision: "allow",
        policyIds: ["seed-app-month"],
      }),
    );
    const d = await evaluateBudget("eng", "research");
    assert.equal(d.allow, false);
    assert.equal(d.policyId, "budget-monthly-app");
    assert.equal(d.scope, "app");
    assert.equal(d.period, "monthly");
  });
});

describe("budget status", () => {
  it("reports remaining and warn when ratio crosses threshold", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tp-budget-st-"));
    process.env.TOKENPULSE_LEDGER_DIR = dir;
    process.env.TOKENPULSE_BUDGETS_PATH = join(dir, "budgets.json");
    process.env.TOKENPULSE_BUDGET_WARN_RATIO = "0.5";
    delete process.env.TOKENPULSE_DEFAULT_DAILY_USD;
    delete process.env.TOKENPULSE_DEFAULT_MONTHLY_USD;
    await writeFile(
      process.env.TOKENPULSE_BUDGETS_PATH,
      JSON.stringify({
        teams: { sales: { dailyUsd: 10 } },
        apps: { bot: { monthlyUsd: 100 } },
      }),
      "utf8",
    );
    await appendEvent(
      newEvent({
        teamId: "sales",
        appId: "bot",
        model: "gpt-4o-mini",
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
        estimatedCostUsd: 6,
        latencyMs: 1,
        decision: "allow",
        policyIds: ["seed"],
      }),
    );
    const { budgetStatus } = await import("../src/budget.ts");
    const rows = await budgetStatus();
    const teamDaily = rows.find((r) => r.scope === "team" && r.id === "sales" && r.period === "daily");
    assert.ok(teamDaily);
    assert.equal(teamDaily!.spentUsd, 6);
    assert.equal(teamDaily!.capUsd, 10);
    assert.equal(teamDaily!.remainingUsd, 4);
    assert.equal(teamDaily!.warn, true);
    assert.equal(teamDaily!.exhausted, false);
    const appMonthly = rows.find((r) => r.scope === "app" && r.id === "bot" && r.period === "monthly");
    assert.ok(appMonthly);
    assert.equal(appMonthly!.warn, false);
    assert.equal(appMonthly!.spentUsd, 6);
  });
});
