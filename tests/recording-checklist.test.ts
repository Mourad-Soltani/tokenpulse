import assert from "node:assert/strict";
import test from "node:test";
import { recordingChecklist } from "../src/recordingChecklist.js";
import type { UsageEvent } from "../src/types.js";

test("recordingChecklist returns items and next action", () => {
  const events: UsageEvent[] = [
    {
      id: "1",
      timestamp: "2026-11-01T00:00:00.000Z",
      teamId: "finops",
      appId: "chat",
      model: "gpt-4o",
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      estimatedCostUsd: 0.01,
      latencyMs: 100,
      decision: "allow",
      policyIds: [],
    },
  ];
  const cl = recordingChecklist(events);
  assert.equal(cl.version, "tokenpulse-recording-checklist-v1");
  assert.ok(cl.items.length >= 4);
  assert.ok(cl.nextAction.length > 10);
});
