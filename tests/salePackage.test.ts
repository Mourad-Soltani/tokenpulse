import { test } from "node:test";
import assert from "node:assert/strict";
import { salePackage } from "../src/salePackage.js";
import type { UsageEvent } from "../src/types.js";

const sample: UsageEvent[] = [
  {
    id: "1",
    timestamp: "2026-11-25T12:00:00.000Z",
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
];

test("salePackage produces markdown pack", () => {
  const pack = salePackage(sample);
  assert.equal(pack.version, "tokenpulse-sale-package-v1");
  assert.match(pack.markdown, /# Tokenpulse Sale Package/);
  assert.match(pack.markdown, /## Sale readiness/);
  assert.match(pack.markdown, /## Recording script/);
  assert.match(pack.markdown, /## Sample outreach draft/);
  assert.ok(pack.nextAction.length > 10);
});
