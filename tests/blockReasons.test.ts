import { describe, it, expect } from "node:test";
import assert from "node:assert/strict";
import { blockReasonsStatus } from "../src/blockReasons.js";
import type { UsageEvent } from "../src/types.js";

function ev(decision: UsageEvent["decision"], policyIds: string[]): UsageEvent {
  return {
    id: "e",
    timestamp: "2026-10-18T00:00:00.000Z",
    teamId: "t",
    appId: "a",
    model: "m",
    promptTokens: 1,
    completionTokens: 0,
    totalTokens: 1,
    estimatedCostUsd: 0,
    latencyMs: 5,
    decision,
    policyIds,
  };
}

describe("blockReasonsStatus", () => {
  it("aggregates policy ids on blocks and skips notes/allows", () => {
    const events = [
      ev("block", ["budget-daily-team", "budget"]),
      ev("block", ["rate-limited"]),
      ev("block", ["budget-daily-team"]),
      ev("allow", ["model-open"]),
      ev("note", ["operator-note"]),
      ev("block", ["sensitive-block", "sensitive:secret"]),
    ];
    const s = blockReasonsStatus(events);
    assert.equal(s.totalBlocks, 4);
    assert.equal(s.uniquePolicies, 5);
    assert.equal(s.rows[0]?.policyId, "budget-daily-team");
    assert.equal(s.rows[0]?.count, 2);
    assert.ok(s.rows.some((r) => r.policyId === "sensitive-block"));
  });

  it("handles empty and missing policy ids", () => {
    const s = blockReasonsStatus([]);
    assert.equal(s.totalBlocks, 0);
    assert.equal(s.rows.length, 0);
    const s2 = blockReasonsStatus([ev("block", [])]);
    assert.equal(s2.rows[0]?.policyId, "(none)");
    assert.equal(s2.rows[0]?.count, 1);
  });
});
