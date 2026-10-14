import { test } from "node:test";
import assert from "node:assert/strict";
import { metricsText } from "../src/metrics.js";

test("metricsText emits prometheus lines", () => {
  const text = metricsText({
    calls: 10,
    allowed: 7,
    blocked: 2,
    notes: 1,
    tokens: 1000,
    costUsd: 1.25,
    byTeam: {},
    byApp: {},
    byModel: {},
    recentBlocked: [],
    chainOk: true,
    chainChecked: 10,
    budgets: [],
    budgetWarns: 0,
    rates: [],
    rateWarns: 0,
    limits: [],
    limitWarns: 0,
    upstreams: {} as any,
    models: {} as any,
    sensitive: {} as any,
    ledger: {} as any,
    pricing: {} as any,
    gateway: {} as any,
    exports: {} as any,
    policy: {} as any,
    attribution: {} as any,
    correlation: {} as any,
    keys: {} as any,
    discovery: { unknownCostUsd: 5.5, warn: false, unknownModelCount: 1, warnThresholdUsd: 10 } as any,
    unattributed: { unattributedCostUsd: 2, warn: false, warnThresholdUsd: 10 } as any,
    alerts: { version: "tokenpulse-alerts-v1", count: 1, rows: [], notes: "" },
    webhook: {} as any,
  });
  assert.match(text, /tokenpulse_calls_total 10/);
  assert.match(text, /tokenpulse_cost_usd_total 1\.25/);
  assert.match(text, /tokenpulse_alerts_count 1/);
  assert.match(text, /tokenpulse_discovery_unknown_cost_usd 5\.5/);
  assert.match(text, /tokenpulse_chain_ok 1/);
  assert.match(text, /# TYPE tokenpulse_calls_total counter/);
});
