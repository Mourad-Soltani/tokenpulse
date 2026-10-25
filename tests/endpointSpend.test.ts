import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { endpointSpendStatus } from "../src/endpointSpend.js";
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

describe("endpointSpendStatus", () => {
  it("groups allowed events by endpoint and ignores notes/blocks", () => {
    const events = [
      ev({ estimatedCostUsd: 1.0, totalTokens: 100, policyIds: [] }),
      ev({ estimatedCostUsd: 0.5, totalTokens: 50, policyIds: ["mock-allow"] }),
      ev({ estimatedCostUsd: 2.0, totalTokens: 200, policyIds: ["endpoint:embeddings", "mock-allow"] }),
      ev({ decision: "block", estimatedCostUsd: 9, policyIds: ["endpoint:embeddings"] }),
      ev({ decision: "note", estimatedCostUsd: 0 }),
    ];
    const status = endpointSpendStatus(events);
    assert.equal(status.uniqueEndpoints, 2);
    assert.ok(Math.abs(status.totalCostUsd - 3.5) < 0.001);
    assert.equal(status.rows[0].endpoint, "embeddings");
    assert.equal(status.rows[0].calls, 1);
    assert.equal(status.rows[0].tokens, 200);
    assert.ok(Math.abs(status.rows[0].costUsd - 2.0) < 0.001);
    assert.equal(status.rows[1].endpoint, "chat");
    assert.equal(status.rows[1].calls, 2);
    assert.equal(status.rows[1].tokens, 150);
  });
});
