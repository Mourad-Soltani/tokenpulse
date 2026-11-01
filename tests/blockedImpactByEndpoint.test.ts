import { test } from "node:test";
import assert from "node:assert/strict";
import { blockedImpactByEndpointStatus } from "../src/blockedImpactByEndpoint.js";
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

test("blocked impact by endpoint ranks chat vs embeddings by estimated avoided USD", () => {
  const events: UsageEvent[] = [
    ev({ model: "gpt-4o", policyIds: ["budget-daily-team"] }), // chat
    ev({ model: "gpt-4o", policyIds: ["budget-daily-team"] }), // chat
    ev({ model: "text-embedding-3-small", policyIds: ["endpoint:embeddings", "budget-daily-team"] }),
    ev({ decision: "allow", model: "gpt-4o", estimatedCostUsd: 0.5, totalTokens: 1000 }),
  ];
  const s = blockedImpactByEndpointStatus(events);
  assert.equal(s.totalBlocks, 3);
  assert.equal(s.uniqueEndpoints, 2);
  assert.ok(s.estimatedAvoidedUsd > 0);
  assert.equal(s.rows[0]?.endpoint, "chat");
  assert.equal(s.rows[0]?.blocks, 2);
  assert.ok(s.notes.includes("256"));
  assert.ok(s.notes.includes("endpoint"));
});
