import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { upstreamSpendStatus } from "../src/upstreamSpend.js";
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

describe("upstreamSpendStatus", () => {
  it("groups allowed events by upstream source or mock and ignores notes/blocks", () => {
    const events = [
      ev({ estimatedCostUsd: 1.0, totalTokens: 100, policyIds: ["upstream:openai", "live-allow"] }),
      ev({ estimatedCostUsd: 0.5, totalTokens: 50, policyIds: ["upstream:xai"] }),
      ev({ estimatedCostUsd: 2.0, totalTokens: 200, policyIds: ["mock-allow"] }),
      ev({ estimatedCostUsd: 0.3, totalTokens: 30, policyIds: ["upstream:openai", "upstream-fallback"] }),
      ev({ decision: "block", estimatedCostUsd: 9, policyIds: ["upstream:openai"] }),
      ev({ decision: "note", estimatedCostUsd: 0 }),
    ];
    const status = upstreamSpendStatus(events);
    assert.equal(status.uniqueSources, 3);
    assert.ok(Math.abs(status.totalCostUsd - 3.8) < 0.001);
    // sorted by cost: mock 2.0, openai 1.3, xai 0.5
    assert.equal(status.rows[0].source, "mock");
    assert.equal(status.rows[0].calls, 1);
    assert.equal(status.rows[0].tokens, 200);
    assert.ok(Math.abs(status.rows[0].costUsd - 2.0) < 0.001);
    assert.equal(status.rows[1].source, "openai");
    assert.equal(status.rows[1].calls, 2);
    assert.equal(status.rows[1].tokens, 130);
    assert.ok(Math.abs(status.rows[1].costUsd - 1.3) < 0.001);
    assert.equal(status.rows[2].source, "xai");
    assert.equal(status.rows[2].calls, 1);
  });
});
