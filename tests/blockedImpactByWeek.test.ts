import { test } from "node:test";
import assert from "node:assert/strict";
import { blockedImpactByWeekStatus } from "../src/blockedImpactByWeek.js";
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

test("blocked impact by week ranks by estimated avoided USD", () => {
  const events: UsageEvent[] = [
    ev({ timestamp: "2026-11-02T10:00:00Z", model: "gpt-4o" }), // week of Nov 2, 2026 is 2026-W45
    ev({ timestamp: "2026-11-03T10:30:00Z", model: "gpt-4o" }),
    ev({ timestamp: "2026-11-10T11:00:00Z", model: "gpt-4o-mini" }), // next week
    ev({ decision: "allow", timestamp: "2026-11-02T10:00:00Z", estimatedCostUsd: 0.5, totalTokens: 1000 }),
  ];
  const s = blockedImpactByWeekStatus(events);
  assert.equal(s.totalBlocks, 3);
  assert.equal(s.uniqueWeeks, 2);
  assert.ok(s.estimatedAvoidedUsd > 0);
  assert.ok(s.rows[0]?.week.startsWith("2026-W"));
  assert.equal(s.rows[0]?.blocks, 2);
  assert.ok(s.notes.includes("256"));
  assert.ok(s.notes.includes("ISO week"));
});
