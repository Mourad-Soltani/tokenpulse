import { test } from "node:test";
import assert from "node:assert/strict";
import { annualProjectionStatus } from "../src/annualProjection.js";
import type { UsageEvent } from "../src/ledger.js";

test("annualProjectionStatus projects from allowed events", () => {
  const events: UsageEvent[] = [
    { id: "1", timestamp: "2026-11-01T10:00:00Z", teamId: "t", appId: "a", model: "m", promptTokens: 10, completionTokens: 5, totalTokens: 15, estimatedCostUsd: 1.5, latencyMs: 100, decision: "allow", policyIds: [] },
    { id: "2", timestamp: "2026-11-02T10:00:00Z", teamId: "t", appId: "a", model: "m", promptTokens: 10, completionTokens: 5, totalTokens: 15, estimatedCostUsd: 2.5, latencyMs: 100, decision: "allow", policyIds: [] },
    { id: "3", timestamp: "2026-11-02T11:00:00Z", teamId: "t", appId: "a", model: "m", promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0, latencyMs: 10, decision: "block", policyIds: [] },
  ];
  const status = annualProjectionStatus(events);
  assert.equal(status.totalAllowedUsd, 4);
  assert.equal(status.daysWithData, 2);
  assert.ok(status.projectedAnnualUsd > 700);
  assert.equal(status.version, "tokenpulse-annual-v1");
});
