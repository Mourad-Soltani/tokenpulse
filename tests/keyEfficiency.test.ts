import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { keyEfficiencyStatus } from "../src/keyEfficiency.js";
import type { UsageEvent } from "../src/types.js";

function ev(partial: Partial<UsageEvent>): UsageEvent {
  return {
    id: "t",
    timestamp: "2026-10-29T08:00:00.000Z",
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

describe("keyEfficiencyStatus", () => {
  it("ranks by USD per 1M tokens, treating missing key as gateway", () => {
    const events = [
      ev({ policyIds: ["key:cheap"], totalTokens: 1_000_000, estimatedCostUsd: 1.0 }),
      ev({ policyIds: ["key:expensive"], totalTokens: 1_000_000, estimatedCostUsd: 10.0 }),
      ev({ policyIds: ["key:cheap"], totalTokens: 500_000, estimatedCostUsd: 0.5 }),
      ev({ policyIds: [], totalTokens: 100_000, estimatedCostUsd: 0.2 }), // gateway
      ev({ decision: "block", estimatedCostUsd: 99 }),
      ev({ decision: "note" }),
    ];
    const status = keyEfficiencyStatus(events);
    assert.equal(status.calls, 4);
    assert.ok(Math.abs(status.totalCostUsd - 11.7) < 0.001);
    assert.ok(status.rows.some(r => r.keyId === "cheap"));
    assert.ok(status.rows.some(r => r.keyId === "expensive"));
    assert.ok(status.rows.some(r => r.keyId === "gateway"));
    assert.equal(status.rows[0].keyId, "cheap"); // lowest USD/1M first
  });

  it("handles zero tokens safely", () => {
    const status = keyEfficiencyStatus([ev({ totalTokens: 0, estimatedCostUsd: 0, policyIds: ["key:zero"] })]);
    assert.equal(status.overallUsdPer1MTokens, 0);
    assert.equal(status.rows[0].usdPer1MTokens, 0);
    assert.equal(status.rows[0].keyId, "zero");
  });
});
