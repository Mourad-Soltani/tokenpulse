import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { appSpendStatus } from "../src/appSpend.js";
import type { UsageEvent } from "../src/types.js";

function ev(partial: Partial<UsageEvent>): UsageEvent {
  return {
    id: "x",
    timestamp: "2026-10-20T00:00:00.000Z",
    teamId: "t",
    appId: "a",
    model: "gpt-4o",
    promptTokens: 10,
    completionTokens: 5,
    totalTokens: 15,
    estimatedCostUsd: 0.001,
    latencyMs: 100,
    decision: "allow",
    policyIds: [],
    ...partial,
  };
}

describe("appSpendStatus", () => {
  it("ranks allowed events by cost and excludes notes/blocks", () => {
    const events: UsageEvent[] = [
      ev({ appId: "chat-ui", estimatedCostUsd: 0.02, totalTokens: 100 }),
      ev({ appId: "chat-ui", estimatedCostUsd: 0.01, totalTokens: 50 }),
      ev({ appId: "batch-jobs", estimatedCostUsd: 0.05, totalTokens: 200 }),
      ev({ decision: "block", appId: "chat-ui", estimatedCostUsd: 0 }),
      ev({ decision: "note", appId: "ops", estimatedCostUsd: 0 }),
    ];
    const s = appSpendStatus(events);
    assert.equal(s.uniqueApps, 2);
    assert.equal(s.totalCostUsd, 0.08);
    assert.equal(s.rows[0].appId, "batch-jobs");
    assert.equal(s.rows[0].costUsd, 0.05);
    assert.equal(s.rows[0].percent, 62.5);
    assert.equal(s.rows[1].appId, "chat-ui");
    assert.equal(s.rows[1].calls, 2);
  });

  it("handles empty ledger", () => {
    const s = appSpendStatus([]);
    assert.equal(s.uniqueApps, 0);
    assert.equal(s.totalCostUsd, 0);
    assert.equal(s.rows.length, 0);
  });
});
