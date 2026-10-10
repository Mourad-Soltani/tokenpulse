import { test } from "node:test";
import assert from "node:assert/strict";
import { discoveryStatus, isKnownCatalogModel } from "../src/discovery.js";
import type { UsageEvent } from "../src/types.js";

function ev(model: string, team = "t1", app = "a1", ts = "2026-10-10T00:00:00.000Z"): UsageEvent {
  return {
    id: "x",
    timestamp: ts,
    teamId: team,
    appId: app,
    model,
    promptTokens: 1,
    completionTokens: 1,
    totalTokens: 2,
    estimatedCostUsd: 0,
    latencyMs: 1,
    decision: "allow",
    policyIds: [],
  };
}

test("known catalog models are not discovery rows", () => {
  assert.equal(isKnownCatalogModel("gpt-4o"), true);
  assert.equal(isKnownCatalogModel("openai/gpt-4o"), true);
  assert.equal(isKnownCatalogModel("mystery-model"), false);
  const status = discoveryStatus([ev("gpt-4o"), ev("mystery-model")]);
  assert.equal(status.unknownModelCount, 1);
  assert.equal(status.rows[0]?.model, "mystery-model");
  assert.equal(status.rows[0]?.calls, 1);
});

test("aggregates teams apps and last seen", () => {
  const status = discoveryStatus([
    ev("shadow-llm", "finance", "bot", "2026-10-10T01:00:00.000Z"),
    ev("shadow-llm", "ops", "cli", "2026-10-10T02:00:00.000Z"),
    ev("other", "finance", "bot"),
  ]);
  assert.equal(status.unknownModelCount, 2);
  assert.equal(status.unknownCalls, 3);
  const shadow = status.rows.find((r) => r.model === "shadow-llm");
  assert.ok(shadow);
  assert.equal(shadow!.calls, 2);
  assert.deepEqual(shadow!.teams, ["finance", "ops"]);
  assert.equal(shadow!.lastSeenAt, "2026-10-10T02:00:00.000Z");
});
