import { test } from "node:test";
import assert from "node:assert/strict";
import { blockedImpactByKeyStatus } from "../src/blockedImpactByKey.js";
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

test("blocked impact by key ranks by estimated avoided USD", () => {
  const events: UsageEvent[] = [
    ev({ policyIds: ["key:prod-billing", "budget-daily-team"], model: "gpt-4o" }),
    ev({ policyIds: ["key:prod-billing", "budget-daily-team"], model: "gpt-4o" }),
    ev({ policyIds: ["key:dev-chat", "rate-limited"], model: "gpt-4o-mini" }),
    ev({ decision: "allow", policyIds: ["key:prod-billing"], estimatedCostUsd: 0.5, totalTokens: 1000 }),
  ];
  const s = blockedImpactByKeyStatus(events);
  assert.equal(s.totalBlocks, 3);
  assert.equal(s.uniqueKeys, 2);
  assert.ok(s.estimatedAvoidedUsd > 0);
  assert.equal(s.rows[0]?.keyId, "prod-billing");
  assert.equal(s.rows[0]?.blocks, 2);
  assert.ok(s.notes.includes("256"));
  assert.ok(s.notes.includes("key:"));
});
