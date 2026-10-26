import { test } from "node:test";
import assert from "node:assert/strict";
import { blockedImpactStatus } from "../src/blockedImpact.js";
import type { UsageEvent } from "../src/types.js";

function ev(partial: Partial<UsageEvent>): UsageEvent {
  return {
    id: "x",
    timestamp: "2026-10-26T00:00:00Z",
    teamId: "t",
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

test("blocked impact ranks by count and estimates avoided USD", () => {
  const events: UsageEvent[] = [
    ev({ model: "gpt-4o-mini" }),
    ev({ model: "gpt-4o-mini" }),
    ev({ model: "gpt-4o" }),
    ev({ decision: "allow", model: "gpt-4o-mini", estimatedCostUsd: 0.01, totalTokens: 100 }),
    ev({ decision: "note", note: "x" }),
  ];
  const s = blockedImpactStatus(events);
  assert.equal(s.totalBlocks, 3);
  assert.equal(s.uniqueModels, 2);
  assert.ok(s.estimatedAvoidedUsd > 0);
  assert.equal(s.rows[0]?.model, "gpt-4o-mini");
  assert.equal(s.rows[0]?.blocks, 2);
  assert.ok(s.notes.includes("256"));
});

test("empty ledger yields zero", () => {
  const s = blockedImpactStatus([]);
  assert.equal(s.totalBlocks, 0);
  assert.equal(s.estimatedAvoidedUsd, 0);
  assert.equal(s.rows.length, 0);
});
