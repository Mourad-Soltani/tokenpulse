import { test } from "node:test";
import assert from "node:assert/strict";
import { modelBlockRateStatus } from "../src/modelBlockRate.js";
import type { UsageEvent } from "../src/types.js";

function ev(partial: Partial<UsageEvent> & Pick<UsageEvent, "id" | "decision" | "model">): UsageEvent {
  return {
    timestamp: "2026-11-01T10:00:00Z",
    teamId: "t",
    appId: "a",
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    latencyMs: 10,
    policyIds: [],
    ...partial,
  };
}

test("modelBlockRateStatus ranks by block rate and excludes notes", () => {
  const events: UsageEvent[] = [
    ev({ id: "1", decision: "allow", model: "gpt-4o" }),
    ev({ id: "2", decision: "block", model: "gpt-4o" }),
    ev({ id: "3", decision: "block", model: "claude" }),
    ev({ id: "4", decision: "block", model: "claude" }),
    ev({ id: "5", decision: "note", model: "" }),
  ];
  const status = modelBlockRateStatus(events);
  assert.equal(status.uniqueModels, 2);
  assert.equal(status.totalAttempts, 4);
  assert.equal(status.totalBlocked, 3);
  assert.equal(status.overallBlockRate, 0.75);
  assert.equal(status.rows[0]!.model, "claude");
  assert.equal(status.rows[0]!.blockRate, 1);
  assert.equal(status.rows[1]!.model, "gpt-4o");
  assert.equal(status.rows[1]!.blockRate, 0.5);
  assert.ok(status.notes.includes("Visibility only"));
});
