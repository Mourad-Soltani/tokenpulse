import { test } from "node:test";
import assert from "node:assert/strict";
import { recordingScript } from "../src/recordingScript.js";
import type { UsageEvent } from "../src/types.js";

const sample: UsageEvent[] = [
  {
    id: "1",
    timestamp: "2026-11-20T10:00:00.000Z",
    teamId: "finops",
    appId: "chatbot",
    model: "gpt-4o",
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
    estimatedCostUsd: 0.01,
    latencyMs: 200,
    decision: "allow",
    policyIds: ["model-open"],
  },
  {
    id: "2",
    timestamp: "2026-11-20T10:01:00.000Z",
    teamId: "finops",
    appId: "chatbot",
    model: "gpt-4o",
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    latencyMs: 5,
    decision: "block",
    policyIds: ["budget-daily-team"],
  },
];

test("recordingScript returns markdown with key numbers", () => {
  const out = recordingScript(sample);
  assert.equal(out.version, "tokenpulse-recording-script-v1");
  assert.match(out.markdown, /Tokenpulse DEMO recording script/);
  assert.match(out.markdown, /Allowed calls: 1/);
  assert.match(out.markdown, /Blocked calls: 1/);
  assert.match(out.markdown, /Spoken outline/);
  assert.ok(out.nextAction.length > 10);
});
