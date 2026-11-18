import { test } from "node:test";
import assert from "node:assert/strict";
import { recordingTalkingPoints } from "../src/recordingTalkingPoints.js";
import type { UsageEvent } from "../src/types.js";

test("recordingTalkingPoints on empty ledger", () => {
  const out = recordingTalkingPoints([]);
  assert.equal(out.version, "tokenpulse-recording-talking-points-v1");
  assert.equal(out.ready, false);
  assert.ok(out.script.length >= 4);
  assert.ok(out.cfoLine.includes("assumptions"));
  assert.equal(out.scaleModel.assumptions.length, 4);
});

test("recordingTalkingPoints includes scale numbers and assumptions", () => {
  const events: UsageEvent[] = [
    {
      id: "1",
      timestamp: "2026-11-05T12:00:00.000Z",
      teamId: "engineering",
      appId: "chatbot",
      model: "gpt-4o-mini",
      promptTokens: 1000,
      completionTokens: 200,
      totalTokens: 1200,
      estimatedCostUsd: 0.5,
      latencyMs: 200,
      decision: "allow",
      policyIds: ["allow"],
    },
    {
      id: "2",
      timestamp: "2026-11-05T12:01:00.000Z",
      teamId: "finance",
      appId: "rag",
      model: "gpt-4o",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      latencyMs: 10,
      decision: "block",
      policyIds: ["budget-daily"],
    },
  ];
  const out = recordingTalkingPoints(events, { monthlyRequests: 2_000_000 });
  assert.equal(out.scaleModel.targetMonthlyRequests, 2_000_000);
  assert.ok(out.scaleModel.observedBlockRate > 0);
  assert.ok(out.script.some((line) => line.includes("Four assumptions")));
  assert.ok(out.cfoLine.includes("2,000,000"));
  assert.match(out.note, /projection/);
});
