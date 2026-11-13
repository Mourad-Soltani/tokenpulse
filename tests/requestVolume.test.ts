import { test } from "node:test";
import assert from "node:assert/strict";
import { requestVolumeStatus } from "../src/requestVolume.js";
import type { UsageEvent } from "../src/types.js";

test("requestVolumeStatus counts allow / block / note and averages", () => {
  const events: UsageEvent[] = [
    {
      id: "1",
      timestamp: "2026-11-01T10:00:00Z",
      teamId: "t",
      appId: "a",
      model: "m",
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      estimatedCostUsd: 1.5,
      latencyMs: 100,
      decision: "allow",
      policyIds: [],
    },
    {
      id: "2",
      timestamp: "2026-11-02T10:00:00Z",
      teamId: "t",
      appId: "a",
      model: "m",
      promptTokens: 20,
      completionTokens: 10,
      totalTokens: 30,
      estimatedCostUsd: 2.5,
      latencyMs: 100,
      decision: "allow",
      policyIds: [],
    },
    {
      id: "3",
      timestamp: "2026-11-02T11:00:00Z",
      teamId: "t",
      appId: "a",
      model: "m",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      latencyMs: 10,
      decision: "block",
      policyIds: [],
    },
    {
      id: "4",
      timestamp: "2026-11-02T12:00:00Z",
      teamId: "ops",
      appId: "admin",
      model: "",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      latencyMs: 0,
      decision: "note",
      policyIds: ["operator-note"],
      note: "seed",
    },
  ];
  const status = requestVolumeStatus(events);
  assert.equal(status.totalRequests, 4);
  assert.equal(status.allowedCount, 2);
  assert.equal(status.blockedCount, 1);
  assert.equal(status.noteCount, 1);
  assert.equal(status.daysWithData, 2);
  assert.equal(status.avgTokensPerAllowed, 23); // (15+30)/2 rounded
  assert.ok(Math.abs(status.avgCostPerAllowedUsd - 2) < 0.001);
  assert.equal(status.requestsPerDay, 2);
  assert.equal(status.version, "tokenpulse-request-volume-v1");
});
