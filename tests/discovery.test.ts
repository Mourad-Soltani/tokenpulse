import { test } from "node:test";
import assert from "node:assert/strict";
import { discoveryStatus, discoveryWarnThresholdUsd, isKnownCatalogModel } from "../src/discovery.js";
import type { UsageEvent } from "../src/types.js";

function ev(model: string, team = "t1", app = "a1", ts = "2026-10-10T00:00:00.000Z", cost = 0): UsageEvent {
  return {
    id: "x",
    timestamp: ts,
    teamId: team,
    appId: app,
    model,
    promptTokens: 1,
    completionTokens: 1,
    totalTokens: 2,
    estimatedCostUsd: cost,
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

test("sums estimated cost and ranks by spend", () => {
  const status = discoveryStatus([
    ev("cheap-shadow", "t", "a", "2026-10-10T00:00:00.000Z", 0.1),
    ev("pricey-shadow", "t", "a", "2026-10-10T00:00:00.000Z", 2.5),
    ev("pricey-shadow", "t", "a", "2026-10-10T01:00:00.000Z", 1.5),
  ]);
  assert.equal(status.unknownCostUsd, 4.1);
  assert.equal(status.rows[0]?.model, "pricey-shadow");
  assert.equal(status.rows[0]?.estimatedCostUsd, 4);
  assert.equal(status.rows[1]?.estimatedCostUsd, 0.1);
});


test("warns when unknown cost meets threshold", () => {
  const prev = process.env.TOKENPULSE_DISCOVERY_WARN_USD;
  process.env.TOKENPULSE_DISCOVERY_WARN_USD = "3";
  try {
    const status = discoveryStatus([
      ev("shadow", "t", "a", "2026-10-10T00:00:00.000Z", 2),
      ev("shadow", "t", "a", "2026-10-10T00:00:00.000Z", 1.5),
    ]);
    assert.equal(status.unknownCostUsd, 3.5);
    assert.equal(status.warnThresholdUsd, 3);
    assert.equal(status.warn, true);
  } finally {
    if (prev === undefined) delete process.env.TOKENPULSE_DISCOVERY_WARN_USD;
    else process.env.TOKENPULSE_DISCOVERY_WARN_USD = prev;
  }
});

test("does not warn below threshold or when disabled", () => {
  const prev = process.env.TOKENPULSE_DISCOVERY_WARN_USD;
  process.env.TOKENPULSE_DISCOVERY_WARN_USD = "0";
  try {
    const status = discoveryStatus([ev("shadow", "t", "a", "2026-10-10T00:00:00.000Z", 100)]);
    assert.equal(status.warn, false);
    assert.equal(status.warnThresholdUsd, 0);
  } finally {
    if (prev === undefined) delete process.env.TOKENPULSE_DISCOVERY_WARN_USD;
    else process.env.TOKENPULSE_DISCOVERY_WARN_USD = prev;
  }
  const status2 = discoveryStatus([ev("shadow", "t", "a", "2026-10-10T00:00:00.000Z", 1)]);
  assert.equal(status2.warnThresholdUsd, discoveryWarnThresholdUsd());
  assert.equal(status2.warn, false);
});
