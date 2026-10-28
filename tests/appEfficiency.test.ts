import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { appEfficiencyStatus } from "../src/appEfficiency.js";
import type { UsageEvent } from "../src/types.js";

function ev(partial: Partial<UsageEvent>): UsageEvent {
  return {
    id: "t",
    timestamp: "2026-10-28T08:00:00.000Z",
    teamId: "default",
    appId: "default",
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

describe("appEfficiencyStatus", () => {
  it("ranks apps by USD per 1M tokens on allowed events only", () => {
    const events = [
      ev({ appId: "chatbot", totalTokens: 1_000_000, estimatedCostUsd: 2.0 }),
      ev({ appId: "embeddings-api", totalTokens: 1_000_000, estimatedCostUsd: 8.0 }),
      ev({ appId: "chatbot", totalTokens: 500_000, estimatedCostUsd: 1.0 }),
      ev({ appId: "embeddings-api", decision: "block", estimatedCostUsd: 99 }),
      ev({ appId: "admin", decision: "note", estimatedCostUsd: 0 }),
    ];
    const s = appEfficiencyStatus(events);
    assert.equal(s.calls, 3);
    assert.equal(s.rows[0].appId, "chatbot");
    assert.ok(s.rows[0].usdPer1MTokens < s.rows[1].usdPer1MTokens);
    assert.equal(s.rows.length, 2);
  });
});
