import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { teamEfficiencyStatus } from "../src/teamEfficiency.js";
import type { UsageEvent } from "../src/types.js";

function ev(partial: Partial<UsageEvent>): UsageEvent {
  return {
    id: "t",
    timestamp: "2026-10-28T08:00:00.000Z",
    teamId: "default",
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

describe("teamEfficiencyStatus", () => {
  it("ranks teams by USD per 1M tokens on allowed events only", () => {
    const events = [
      ev({ teamId: "eng", totalTokens: 1_000_000, estimatedCostUsd: 2.0 }),
      ev({ teamId: "research", totalTokens: 1_000_000, estimatedCostUsd: 8.0 }),
      ev({ teamId: "eng", totalTokens: 500_000, estimatedCostUsd: 1.0 }),
      ev({ teamId: "research", decision: "block", estimatedCostUsd: 99 }),
      ev({ teamId: "ops", decision: "note", estimatedCostUsd: 0 }),
    ];
    const s = teamEfficiencyStatus(events);
    assert.equal(s.calls, 3);
    assert.equal(s.rows[0].teamId, "eng");
    assert.ok(s.rows[0].usdPer1MTokens < s.rows[1].usdPer1MTokens);
    assert.equal(s.rows.length, 2);
  });
});
