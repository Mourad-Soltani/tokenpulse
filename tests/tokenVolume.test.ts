import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenVolumeStatus } from "../src/tokenVolume.js";
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

test("tokenVolumeStatus ranks allowed by totalTokens and excludes blocks/notes", () => {
  const events = [
    ev({ id: "small", totalTokens: 100 }),
    ev({ id: "large", totalTokens: 50000, teamId: "research" }),
    ev({ id: "blocked", decision: "block", totalTokens: 999999 }),
    ev({ id: "note", decision: "note", totalTokens: 0 }),
  ];
  const status = tokenVolumeStatus(events);
  assert.equal(status.version, "tokenpulse-token-volume-v1");
  assert.equal(status.rows.length, 2);
  assert.equal(status.rows[0].id, "large");
  assert.equal(status.rows[0].teamId, "research");
  assert.equal(status.rows[0].totalTokens, 50000);
  assert.equal(status.rows[1].id, "small");
});

test("tokenVolumeStatus returns empty when no positive token allows", () => {
  const status = tokenVolumeStatus([ev({ totalTokens: 0 })]);
  assert.equal(status.rows.length, 0);
});
