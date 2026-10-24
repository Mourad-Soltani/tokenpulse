import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dailySpendStatus } from "../src/dailySpend.js";
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

describe("dailySpendStatus", () => {
  it("groups allowed events by UTC day and ignores notes/blocks", () => {
    const events = [
      ev({ timestamp: "2026-10-20T10:00:00.000Z", estimatedCostUsd: 1.5, totalTokens: 100 }),
      ev({ timestamp: "2026-10-20T15:00:00.000Z", estimatedCostUsd: 0.5, totalTokens: 50 }),
      ev({ timestamp: "2026-10-21T08:00:00.000Z", estimatedCostUsd: 2.0, totalTokens: 200 }),
      ev({ timestamp: "2026-10-21T09:00:00.000Z", decision: "block", estimatedCostUsd: 9 }),
      ev({ timestamp: "2026-10-21T09:00:00.000Z", decision: "note", estimatedCostUsd: 0 }),
    ];
    const status = dailySpendStatus(events);
    assert.equal(status.days, 2);
    assert.ok(Math.abs(status.totalCostUsd - 4.0) < 0.001);
    assert.deepEqual(status.rows, [
      { day: "2026-10-20", calls: 2, tokens: 150, costUsd: 2 },
      { day: "2026-10-21", calls: 1, tokens: 200, costUsd: 2 },
    ]);
  });

  it("respects windowDays and orders chronologically", () => {
    const events = [
      ev({ timestamp: "2026-10-01T00:00:00.000Z", estimatedCostUsd: 1 }),
      ev({ timestamp: "2026-10-10T00:00:00.000Z", estimatedCostUsd: 1 }),
      ev({ timestamp: "2026-10-20T00:00:00.000Z", estimatedCostUsd: 1 }),
    ];
    const status = dailySpendStatus(events, 2);
    assert.equal(status.days, 2);
    assert.deepEqual(status.rows.map((r) => r.day), ["2026-10-10", "2026-10-20"]);
  });
});
