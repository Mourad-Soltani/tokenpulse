import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { teamSpendStatus } from "../src/teamSpend.js";
import type { UsageEvent } from "../src/types.js";

function ev(partial: Partial<UsageEvent>): UsageEvent {
  return {
    id: "x",
    timestamp: "2026-10-20T00:00:00.000Z",
    teamId: "default",
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

describe("teamSpendStatus", () => {
  it("ranks allowed events by cost and excludes notes/blocks", () => {
    const events: UsageEvent[] = [
      ev({ teamId: "eng", estimatedCostUsd: 0.02, totalTokens: 100 }),
      ev({ teamId: "eng", estimatedCostUsd: 0.01, totalTokens: 50 }),
      ev({ teamId: "product", estimatedCostUsd: 0.05, totalTokens: 200 }),
      ev({ decision: "block", teamId: "eng", estimatedCostUsd: 0 }),
      ev({ decision: "note", teamId: "ops", estimatedCostUsd: 0 }),
    ];
    const s = teamSpendStatus(events);
    assert.equal(s.uniqueTeams, 2);
    assert.equal(s.totalCostUsd, 0.08);
    assert.equal(s.rows[0].teamId, "product");
    assert.equal(s.rows[0].costUsd, 0.05);
    assert.equal(s.rows[0].percent, 62.5);
    assert.equal(s.rows[1].teamId, "eng");
    assert.equal(s.rows[1].calls, 2);
  });
});
