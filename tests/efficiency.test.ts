import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { efficiencyStatus } from "../src/efficiency.js";
import type { UsageEvent } from "../src/types.js";

function ev(partial: Partial<UsageEvent>): UsageEvent {
  return {
    id: "t",
    timestamp: "2026-10-27T08:00:00.000Z",
    teamId: "t",
    appId: "a",
    model: "gpt-4o-mini",
    promptTokens: 10,
    completionTokens: 10,
    totalTokens: 20,
    estimatedCostUsd: 0.001,
    latencyMs: 100,
    decision: "allow",
    policyIds: [],
    ...partial,
  } as UsageEvent;
}

describe("efficiencyStatus", () => {
  it("computes overall and per-model USD per 1M tokens, ignoring notes/blocks", () => {
    const events = [
      ev({ model: "cheap", totalTokens: 1_000_000, estimatedCostUsd: 1.0 }),
      ev({ model: "expensive", totalTokens: 1_000_000, estimatedCostUsd: 10.0 }),
      ev({ model: "cheap", totalTokens: 500_000, estimatedCostUsd: 0.5 }),
      ev({ decision: "block", estimatedCostUsd: 99 }),
      ev({ decision: "note" }),
    ];
    const status = efficiencyStatus(events);
    assert.equal(status.calls, 3);
    assert.ok(Math.abs(status.totalCostUsd - 11.5) < 0.001);
    assert.ok(status.overallUsdPer1MTokens > 0);
    assert.equal(status.rows.length, 2);
    assert.equal(status.rows[0].model, "cheap"); // lower cost per token first
    assert.ok(status.rows[0].usdPer1MTokens < status.rows[1].usdPer1MTokens);
  });

  it("handles zero tokens safely", () => {
    const status = efficiencyStatus([ev({ totalTokens: 0, estimatedCostUsd: 0 })]);
    assert.equal(status.overallUsdPer1MTokens, 0);
    assert.equal(status.rows[0].usdPer1MTokens, 0);
  });
});
