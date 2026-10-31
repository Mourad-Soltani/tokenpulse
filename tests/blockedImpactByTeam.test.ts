import { test } from "node:test";
import assert from "node:assert/strict";
import { blockedImpactByTeamStatus } from "../src/blockedImpactByTeam.js";
import type { UsageEvent } from "../src/types.js";

function ev(partial: Partial<UsageEvent>): UsageEvent {
  return {
    id: "x",
    timestamp: "2026-10-31T00:00:00Z",
    teamId: "default",
    appId: "a",
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

test("blocked impact by team ranks by estimated avoided USD", () => {
  const events: UsageEvent[] = [
    ev({ teamId: "finops", model: "gpt-4o" }),
    ev({ teamId: "finops", model: "gpt-4o" }),
    ev({ teamId: "eng", model: "gpt-4o-mini" }),
    ev({ decision: "allow", teamId: "finops", estimatedCostUsd: 0.5, totalTokens: 1000 }),
  ];
  const s = blockedImpactByTeamStatus(events);
  assert.equal(s.totalBlocks, 3);
  assert.equal(s.uniqueTeams, 2);
  assert.ok(s.estimatedAvoidedUsd > 0);
  assert.equal(s.rows[0]?.teamId, "finops");
  assert.equal(s.rows[0]?.blocks, 2);
  assert.ok(s.notes.includes("256"));
});
