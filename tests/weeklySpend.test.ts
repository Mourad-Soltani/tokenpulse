import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { weeklySpendStatus } from "../src/weeklySpend.js";
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

describe("weeklySpendStatus", () => {
  it("groups allowed events by UTC ISO week and ignores notes/blocks", () => {
    // 2026-10-19 Mon → 2026-W43; 2026-10-26 Mon → 2026-W44
    const events = [
      ev({ timestamp: "2026-10-19T10:00:00.000Z", estimatedCostUsd: 1.0, totalTokens: 100 }),
      ev({ timestamp: "2026-10-21T15:00:00.000Z", estimatedCostUsd: 0.5, totalTokens: 50 }),
      ev({ timestamp: "2026-10-26T08:00:00.000Z", estimatedCostUsd: 2.0, totalTokens: 200 }),
      ev({ timestamp: "2026-10-22T09:00:00.000Z", decision: "block", estimatedCostUsd: 9 }),
      ev({ timestamp: "2026-10-22T09:00:00.000Z", decision: "note", estimatedCostUsd: 0 }),
    ];
    const status = weeklySpendStatus(events);
    assert.equal(status.weeks, 2);
    assert.ok(Math.abs(status.totalCostUsd - 3.5) < 0.001);
    assert.deepEqual(status.rows, [
      { week: "2026-W43", calls: 2, tokens: 150, costUsd: 1.5 },
      { week: "2026-W44", calls: 1, tokens: 200, costUsd: 2.0 },
    ]);
  });

  it("respects windowWeeks", () => {
    const events = [
      ev({ timestamp: "2026-10-05T00:00:00.000Z", estimatedCostUsd: 1 }), // W41
      ev({ timestamp: "2026-10-12T00:00:00.000Z", estimatedCostUsd: 1 }), // W42
      ev({ timestamp: "2026-10-19T00:00:00.000Z", estimatedCostUsd: 1 }), // W43
    ];
    const status = weeklySpendStatus(events, 2);
    assert.equal(status.weeks, 2);
    assert.deepEqual(
      status.rows.map((r) => r.week),
      ["2026-W42", "2026-W43"],
    );
  });
});
