import { test } from "node:test";
import assert from "node:assert/strict";
import { recordingPrep } from "../src/recordingPrep.js";
import type { UsageEvent } from "../src/types.js";

test("recordingPrep on empty ledger", () => {
  const out = recordingPrep([]);
  assert.equal(out.allowCount, 0);
  assert.equal(out.blockCount, 0);
  assert.match(out.note, /Ledger empty/);
});

test("recordingPrep ranks top team", () => {
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
      appId: "rag-pipeline",
      model: "gpt-4o",
      promptTokens: 500,
      completionTokens: 100,
      totalTokens: 600,
      estimatedCostUsd: 2.0,
      latencyMs: 300,
      decision: "allow",
      policyIds: ["allow"],
    },
  ];
  const out = recordingPrep(events);
  assert.equal(out.topTeam?.id, "finance");
  assert.ok(out.totalAllowedUsd > 0);
  assert.equal(out.allowCount, 2);
});
