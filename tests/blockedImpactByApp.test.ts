import { test } from "node:test";
import assert from "node:assert/strict";
import { blockedImpactByAppStatus } from "../src/blockedImpactByApp.js";
import type { UsageEvent } from "../src/types.js";

function ev(partial: Partial<UsageEvent>): UsageEvent {
  return {
    id: "x",
    timestamp: "2026-10-31T00:00:00Z",
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

test("blocked impact by app ranks by estimated avoided USD", () => {
  const events: UsageEvent[] = [
    ev({ appId: "billing", model: "gpt-4o" }),
    ev({ appId: "billing", model: "gpt-4o" }),
    ev({ appId: "chatbot", model: "gpt-4o-mini" }),
    ev({ decision: "allow", appId: "billing", estimatedCostUsd: 0.5, totalTokens: 1000 }),
  ];
  const s = blockedImpactByAppStatus(events);
  assert.equal(s.totalBlocks, 3);
  assert.equal(s.uniqueApps, 2);
  assert.ok(s.estimatedAvoidedUsd > 0);
  assert.equal(s.rows[0]?.appId, "billing");
  assert.equal(s.rows[0]?.blocks, 2);
  assert.ok(s.notes.includes("256"));
});
