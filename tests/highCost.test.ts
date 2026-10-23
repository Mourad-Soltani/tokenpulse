import { test } from "node:test";
import assert from "node:assert/strict";
import { highCostStatus } from "../src/highCost.js";
import type { UsageEvent } from "../src/types.js";

function ev(partial: Partial<UsageEvent>): UsageEvent {
  return {
    id: "e1",
    timestamp: "2026-10-23T12:00:00Z",
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

test("highCostStatus ranks allowed by cost and excludes blocks/notes", () => {
  const events = [
    ev({ id: "cheap", estimatedCostUsd: 0.001 }),
    ev({ id: "expensive", estimatedCostUsd: 1.5, teamId: "finance" }),
    ev({ id: "blocked", decision: "block", estimatedCostUsd: 99 }),
    ev({ id: "note", decision: "note", estimatedCostUsd: 0 }),
  ];
  const status = highCostStatus(events);
  assert.equal(status.version, "tokenpulse-high-cost-v1");
  assert.equal(status.rows.length, 2);
  assert.equal(status.rows[0].id, "expensive");
  assert.equal(status.rows[0].teamId, "finance");
  assert.equal(status.rows[1].id, "cheap");
});

test("highCostStatus returns empty when no positive cost allows", () => {
  const status = highCostStatus([ev({ estimatedCostUsd: 0 })]);
  assert.equal(status.rows.length, 0);
});
