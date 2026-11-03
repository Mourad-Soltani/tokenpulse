import { test } from "node:test";
import assert from "node:assert/strict";
import { blockedImpactByHourStatus } from "../src/blockedImpactByHour.js";
import type { UsageEvent } from "../src/types.js";

function ev(partial: Partial<UsageEvent>): UsageEvent {
  return {
    id: "x",
    timestamp: "2026-11-02T00:00:00Z",
    teamId: "t",
    appId: "default",
    model: "gpt-4o-mini",
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    latencyMs: 1,
    decision: "block",
    policyIds: ["budget-daily-team"],
    ...partial,
  };
}

test("blocked impact by hour ranks by estimated avoided USD", () => {
  const events: UsageEvent[] = [
    ev({ timestamp: "2026-11-01T10:00:00Z", model: "gpt-4o" }),
    ev({ timestamp: "2026-11-01T10:30:00Z", model: "gpt-4o" }),
    ev({ timestamp: "2026-11-01T11:00:00Z", model: "gpt-4o-mini" }),
    ev({ decision: "allow", timestamp: "2026-11-01T10:00:00Z", estimatedCostUsd: 0.5, totalTokens: 1000 }),
  ];
  const s = blockedImpactByHourStatus(events);
  assert.equal(s.totalBlocks, 3);
  assert.equal(s.uniqueHours, 2);
  assert.ok(s.estimatedAvoidedUsd > 0);
  assert.equal(s.rows[0]?.hour, "2026-11-01T10");
  assert.equal(s.rows[0]?.blocks, 2);
  assert.ok(s.notes.includes("256"));
  assert.ok(s.notes.includes("UTC hour"));
});
