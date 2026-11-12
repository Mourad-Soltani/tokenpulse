import { test } from "node:test";
import assert from "node:assert/strict";
import { annualAvoidedStatus } from "../src/annualAvoided.js";
import type { UsageEvent } from "../src/types.js";

test("annualAvoidedStatus projects from block events", () => {
  const events: UsageEvent[] = [
    {
      id: "1",
      timestamp: "2026-11-01T10:00:00Z",
      teamId: "t",
      appId: "a",
      model: "gpt-4o-mini",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      latencyMs: 10,
      decision: "block",
      policyIds: ["budget-daily"],
    },
    {
      id: "2",
      timestamp: "2026-11-02T10:00:00Z",
      teamId: "t",
      appId: "a",
      model: "gpt-4o-mini",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      latencyMs: 10,
      decision: "block",
      policyIds: ["budget-daily"],
    },
    {
      id: "3",
      timestamp: "2026-11-02T11:00:00Z",
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
  ];
  const status = annualAvoidedStatus(events);
  assert.equal(status.version, "tokenpulse-annual-avoided-v1");
  assert.ok(status.totalAvoidedUsd >= 0);
  assert.equal(status.daysWithBlocks, 2);
  assert.ok(status.projectedAnnualAvoidedUsd >= 0);
  assert.ok(status.assumedPromptTokens > 0);
});

test("annualAvoidedStatus zero when no blocks", () => {
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
      estimatedCostUsd: 1,
      latencyMs: 50,
      decision: "allow",
      policyIds: [],
    },
  ];
  const status = annualAvoidedStatus(events);
  assert.equal(status.totalAvoidedUsd, 0);
  assert.equal(status.daysWithBlocks, 0);
  assert.equal(status.projectedAnnualAvoidedUsd, 0);
});
