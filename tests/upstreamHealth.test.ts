import { describe, it, expect } from "node:test";
import assert from "node:assert/strict";
import { upstreamHealthStatus } from "../src/upstreamHealth.js";
import type { UsageEvent } from "../src/types.js";

function ev(decision: UsageEvent["decision"], policyIds: string[] = []): UsageEvent {
  return {
    id: "e",
    timestamp: "2026-10-15T00:00:00.000Z",
    teamId: "t",
    appId: "a",
    model: "m",
    promptTokens: 1,
    completionTokens: 1,
    totalTokens: 2,
    estimatedCostUsd: 0,
    latencyMs: 10,
    decision,
    policyIds,
  };
}

describe("upstreamHealthStatus", () => {
  it("counts successes and upstream_error failures, skips notes", () => {
    const events = [
      ev("allow"),
      ev("allow", ["upstream:openai"]),
      ev("block", ["upstream_error"]),
      ev("block", ["budget-daily"]),
      ev("note", []),
      ev("block", ["upstream_error", "stream"]),
    ];
    const s = upstreamHealthStatus(events);
    assert.equal(s.successes, 2);
    assert.equal(s.failures, 2);
    assert.equal(s.samples, 4);
    assert.equal(s.successRate, 50);
  });

  it("handles empty as perfect rate", () => {
    const s = upstreamHealthStatus([]);
    assert.equal(s.samples, 0);
    assert.equal(s.successRate, 100);
  });
});
