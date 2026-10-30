import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { endpointEfficiencyStatus } from "../src/endpointEfficiency.js";
import type { UsageEvent } from "../src/types.js";

function ev(partial: Partial<UsageEvent>): UsageEvent {
  return {
    id: "t",
    timestamp: "2026-10-30T08:00:00.000Z",
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

describe("endpointEfficiencyStatus", () => {
  it("ranks endpoints by USD per 1M tokens on allowed events only", () => {
    const events = [
      ev({ policyIds: ["endpoint:embeddings"], totalTokens: 1_000_000, estimatedCostUsd: 1.5 }),
      ev({ policyIds: [], totalTokens: 1_000_000, estimatedCostUsd: 6.0 }), // chat
      ev({ policyIds: ["endpoint:embeddings"], totalTokens: 500_000, estimatedCostUsd: 0.5 }),
      ev({ decision: "block", estimatedCostUsd: 99 }),
      ev({ decision: "note", estimatedCostUsd: 0 }),
    ];
    const s = endpointEfficiencyStatus(events);
    assert.equal(s.calls, 3);
    assert.equal(s.rows[0].endpoint, "embeddings");
    assert.ok(s.rows[0].usdPer1MTokens < s.rows[1].usdPer1MTokens);
    assert.equal(s.rows.length, 2);
  });
});
