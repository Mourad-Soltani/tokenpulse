import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { monthlySpendStatus } from "../src/monthlySpend.js";
import type { UsageEvent } from "../src/types.js";

function ev(partial: Partial<UsageEvent>): UsageEvent {
  return {
    id: "t",
    timestamp: "2026-10-20T12:00:00.000Z",
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

describe("monthlySpendStatus", () => {
  it("groups allowed events by UTC month and ignores notes/blocks", () => {
    const events = [
      ev({ timestamp: "2026-09-15T10:00:00.000Z", estimatedCostUsd: 1.5, totalTokens: 100 }),
      ev({ timestamp: "2026-10-20T15:00:00.000Z", estimatedCostUsd: 0.5, totalTokens: 50 }),
      ev({ timestamp: "2026-10-21T08:00:00.000Z", estimatedCostUsd: 2.0, totalTokens: 200 }),
      ev({ timestamp: "2026-10-22T09:00:00.000Z", decision: "block", estimatedCostUsd: 9 }),
      ev({ timestamp: "2026-10-22T09:00:00.000Z", decision: "note", estimatedCostUsd: 0 }),
    ];
    const status = monthlySpendStatus(events);
    assert.equal(status.months, 2);
    assert.ok(Math.abs(status.totalCostUsd - 4.0) < 0.001);
    assert.deepEqual(status.rows, [
      { month: "2026-09", calls: 1, tokens: 100, costUsd: 1.5 },
      { month: "2026-10", calls: 2, tokens: 250, costUsd: 2.5 },
    ]);
  });

  it("respects windowMonths", () => {
    const events = [
      ev({ timestamp: "2026-08-01T00:00:00.000Z", estimatedCostUsd: 1 }),
      ev({ timestamp: "2026-09-01T00:00:00.000Z", estimatedCostUsd: 1 }),
      ev({ timestamp: "2026-10-01T00:00:00.000Z", estimatedCostUsd: 1 }),
    ];
    const status = monthlySpendStatus(events, 2);
    assert.equal(status.months, 2);
    assert.deepEqual(status.rows.map((r) => r.month), ["2026-09", "2026-10"]);
  });
});
