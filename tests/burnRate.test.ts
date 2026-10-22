import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projectBurnRate, hoursElapsedUtc, daysElapsedUtc } from "../src/burnRate.js";
import type { BudgetStatusRow } from "../src/budget.js";

function row(over: Partial<BudgetStatusRow> = {}): BudgetStatusRow {
  return {
    scope: "team",
    id: "eng",
    period: "daily",
    spentUsd: 5,
    capUsd: 10,
    remainingUsd: 5,
    ratio: 0.5,
    warn: false,
    exhausted: false,
    ...over,
  };
}

describe("projectBurnRate", () => {
  it("projects linear end-of-day spend and flags exhaust", () => {
    const now = new Date("2026-10-16T12:00:00.000Z");
    assert.equal(hoursElapsedUtc(now), 12);
    const status = projectBurnRate(
      [
        row({ spentUsd: 5, capUsd: 10 }),
        row({ id: "ops", spentUsd: 2, capUsd: 10 }),
        row({ period: "monthly", id: "eng", spentUsd: 50, capUsd: 200 }),
      ],
      now,
    );
    assert.equal(status.version, "tokenpulse-burn-v1");
    assert.equal(status.day, "2026-10-16");
    assert.equal(status.hoursElapsed, 12);
    assert.equal(status.rows.length, 2);
    assert.equal(status.rows[0]!.projectedUsd, 10);
    assert.equal(status.rows[0]!.willExhaust, true);
    assert.equal(status.rows[1]!.projectedUsd, 4);
    assert.equal(status.rows[1]!.willExhaust, false);
    assert.equal(status.exhaustWarnCount, 1);
    assert.equal(status.monthlyRows.length, 1);
    assert.ok(status.monthlyRows[0]!.daysElapsed > 0);
    assert.equal(status.monthlyExhaustWarnCount, 0);
  });

  it("projects monthly exhaust", () => {
    const now = new Date("2026-10-16T12:00:00.000Z");
    const status = projectBurnRate(
      [row({ period: "monthly", spentUsd: 100, capUsd: 50 })],
      now,
    );
    assert.equal(status.monthlyRows.length, 1);
    assert.equal(status.monthlyRows[0]!.willExhaust, true);
    assert.equal(status.monthlyExhaustWarnCount, 1);
  });

  it("returns empty rows when no caps", () => {
    const status = projectBurnRate([], new Date("2026-10-16T00:30:00.000Z"));
    assert.equal(status.rows.length, 0);
    assert.equal(status.exhaustWarnCount, 0);
    assert.equal(status.monthlyRows.length, 0);
    assert.equal(status.monthlyExhaustWarnCount, 0);
    assert.ok(status.hoursElapsed > 0);
  });
});
