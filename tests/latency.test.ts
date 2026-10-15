import { describe, it, expect } from "node:test";
import assert from "node:assert/strict";
import { latencyStatus } from "../src/latency.js";
import type { UsageEvent } from "../src/types.js";

function ev(latencyMs: number, decision: UsageEvent["decision"] = "allow"): UsageEvent {
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
    latencyMs,
    decision,
    policyIds: [],
  };
}

describe("latencyStatus", () => {
  it("computes avg / percentiles and skips notes", () => {
    const events = [ev(10), ev(20), ev(30), ev(100, "note"), ev(40)];
    const s = latencyStatus(events);
    assert.equal(s.samples, 4);
    assert.equal(s.avgMs, 25);
    assert.equal(s.p50Ms, 20);
    assert.equal(s.maxMs, 40);
    assert.ok(s.p95Ms >= 30);
  });

  it("handles empty", () => {
    const s = latencyStatus([]);
    assert.equal(s.samples, 0);
    assert.equal(s.avgMs, 0);
    assert.equal(s.maxMs, 0);
  });
});
