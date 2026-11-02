import { test } from "node:test";
import assert from "node:assert/strict";
import { blockedImpactByReasonStatus } from "../src/blockedImpactByReason.js";
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

test("blocked impact by reason ranks by estimated avoided USD", () => {
  const events: UsageEvent[] = [
    ev({ policyIds: ["budget-daily-team"], model: "gpt-4o" }),
    ev({ policyIds: ["budget-daily-team"], model: "gpt-4o" }),
    ev({ policyIds: ["rate-limited"], model: "gpt-4o-mini" }),
    ev({ decision: "allow", policyIds: ["budget-daily-team"], estimatedCostUsd: 0.5, totalTokens: 1000 }),
  ];
  const s = blockedImpactByReasonStatus(events);
  assert.equal(s.totalBlocks, 3);
  assert.equal(s.uniquePolicies, 2);
  assert.ok(s.estimatedAvoidedUsd > 0);
  assert.equal(s.rows[0]?.policyId, "budget-daily-team");
  assert.equal(s.rows[0]?.blocks, 2);
  assert.ok(s.notes.includes("256"));
  assert.ok(s.notes.includes("primary"));
});
