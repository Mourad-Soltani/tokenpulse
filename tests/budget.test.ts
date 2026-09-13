import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendEvent, newEvent } from "../src/ledger.ts";
import { capForTeam, evaluateBudget, loadBudgets } from "../src/budget.ts";

describe("budget", () => {
  before(async () => {
    const dir = await mkdtemp(join(tmpdir(), "tp-budget-"));
    process.env.TOKENPULSE_LEDGER_DIR = dir;
    process.env.TOKENPULSE_BUDGETS_PATH = join(dir, "budgets.json");
    delete process.env.TOKENPULSE_DEFAULT_DAILY_USD;
    await writeFile(
      process.env.TOKENPULSE_BUDGETS_PATH,
      JSON.stringify({ defaultDailyUsd: 1, teams: { tight: { dailyUsd: 0 } } }),
      "utf8",
    );
  });

  it("loads caps from file", async () => {
    const cfg = await loadBudgets();
    assert.equal(capForTeam(cfg, "tight"), 0);
    assert.equal(capForTeam(cfg, "other"), 1);
  });

  it("blocks when team daily cap is 0", async () => {
    const d = await evaluateBudget("tight");
    assert.equal(d.allow, false);
    assert.equal(d.policyId, "budget-daily-team");
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
});
