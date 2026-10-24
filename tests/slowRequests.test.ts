import { test } from "node:test";
import assert from "node:assert/strict";
import { slowRequestStatus } from "../src/slowRequests.js";
import type { UsageEvent } from "../src/types.js";

function ev(partial: Partial<UsageEvent>): UsageEvent {
  return {
    id: "e1",
    timestamp: "2026-10-24T12:00:00Z",
    teamId: "t1",
    appId: "a1",
    model: "gpt-4o",
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
    estimatedCostUsd: 0.01,
    latencyMs: 100,
    decision: "allow",
    policyIds: [],
    ...partial,
  };
}

test("slowRequestStatus ranks allowed by latency and excludes blocks/notes", () => {
  const events = [
    ev({ id: "fast", latencyMs: 50 }),
    ev({ id: "slow", latencyMs: 2500, teamId: "analytics" }),
    ev({ id: "blocked", decision: "block", latencyMs: 9999 }),
    ev({ id: "note", decision: "note", latencyMs: 0 }),
  ];
  const status = slowRequestStatus(events);
  assert.equal(status.version, "tokenpulse-slow-requests-v1");
  assert.equal(status.rows.length, 2);
  assert.equal(status.rows[0].id, "slow");
  assert.equal(status.rows[0].teamId, "analytics");
  assert.equal(status.rows[0].latencyMs, 2500);
  assert.equal(status.rows[1].id, "fast");
});

test("slowRequestStatus returns empty when no positive latency allows", () => {
  const status = slowRequestStatus([ev({ latencyMs: 0 })]);
  assert.equal(status.rows.length, 0);
});
