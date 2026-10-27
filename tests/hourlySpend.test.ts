import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hourlySpendStatus } from "../src/hourlySpend.js";
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

describe("hourlySpendStatus", () => {
  it("groups allowed events by UTC hour and ignores notes/blocks", () => {
    const events = [
      ev({ timestamp: "2026-10-27T08:15:00.000Z", estimatedCostUsd: 1.0, totalTokens: 100 }),
      ev({ timestamp: "2026-10-27T08:45:00.000Z", estimatedCostUsd: 0.5, totalTokens: 50 }),
      ev({ timestamp: "2026-10-27T09:10:00.000Z", estimatedCostUsd: 2.0, totalTokens: 200 }),
      ev({ timestamp: "2026-10-27T08:20:00.000Z", decision: "block", estimatedCostUsd: 9 }),
      ev({ timestamp: "2026-10-27T08:20:00.000Z", decision: "note", estimatedCostUsd: 0 }),
    ];
    const status = hourlySpendStatus(events);
    assert.equal(status.hours, 2);
    assert.ok(Math.abs(status.totalCostUsd - 3.5) < 0.001);
    assert.deepEqual(status.rows, [
      { hour: "2026-10-27T08", calls: 2, tokens: 150, costUsd: 1.5 },
      { hour: "2026-10-27T09", calls: 1, tokens: 200, costUsd: 2.0 },
    ]);
  });

  it("respects windowHours", () => {
    const events = [
      ev({ timestamp: "2026-10-27T06:00:00.000Z", estimatedCostUsd: 1 }),
      ev({ timestamp: "2026-10-27T07:00:00.000Z", estimatedCostUsd: 1 }),
      ev({ timestamp: "2026-10-27T08:00:00.000Z", estimatedCostUsd: 1 }),
    ];
    const status = hourlySpendStatus(events, 2);
    assert.equal(status.hours, 2);
    assert.deepEqual(
      status.rows.map((r) => r.hour),
      ["2026-10-27T07", "2026-10-27T08"],
    );
  });
});
