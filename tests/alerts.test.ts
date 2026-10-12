import { test } from "node:test";
import assert from "node:assert/strict";
import { alertsStatus } from "../src/alerts.js";

test("alertsStatus aggregates warns", () => {
  const s = alertsStatus({
    budgetWarns: 1,
    rateWarns: 0,
    limitWarns: 2,
    discovery: { warn: true, unknownCostUsd: 12.5, warnThresholdUsd: 10, unknownModelCount: 2 } as any,
    unattributed: { warn: false, unattributedCostUsd: 3, warnThresholdUsd: 10 } as any,
    keys: { idleWarnCount: 1, expiryWarnCount: 0 } as any,
  });
  assert.equal(s.version, "tokenpulse-alerts-v1");
  assert.equal(s.count, 4);
  assert.ok(s.rows.some((r) => r.source === "budget"));
  assert.ok(s.rows.some((r) => r.source === "discovery"));
  assert.ok(s.rows.some((r) => r.source === "keys"));
  assert.ok(!s.rows.some((r) => r.source === "unattributed"));
});

test("alertsStatus empty when no warns", () => {
  const s = alertsStatus({
    budgetWarns: 0,
    rateWarns: 0,
    limitWarns: 0,
    discovery: { warn: false } as any,
    unattributed: { warn: false } as any,
    keys: {} as any,
  });
  assert.equal(s.count, 0);
  assert.equal(s.rows.length, 0);
});
