import { test } from "node:test";
import assert from "node:assert/strict";
import { webhookStatus } from "../src/notify.js";

test("webhookStatus unconfigured by default", () => {
  const prev = process.env.TOKENPULSE_ALERT_WEBHOOK_URL;
  delete process.env.TOKENPULSE_ALERT_WEBHOOK_URL;
  const s = webhookStatus();
  assert.equal(s.configured, false);
  assert.equal(s.host, null);
  if (prev) process.env.TOKENPULSE_ALERT_WEBHOOK_URL = prev;
});

test("webhookStatus parses host only", () => {
  const prev = process.env.TOKENPULSE_ALERT_WEBHOOK_URL;
  process.env.TOKENPULSE_ALERT_WEBHOOK_URL = "https://hooks.example.com/services/secret-token";
  const s = webhookStatus();
  assert.equal(s.configured, true);
  assert.equal(s.host, "hooks.example.com");
  assert.ok(!JSON.stringify(s).includes("secret-token"));
  if (prev) process.env.TOKENPULSE_ALERT_WEBHOOK_URL = prev;
  else delete process.env.TOKENPULSE_ALERT_WEBHOOK_URL;
});

test("alertIntervalSec defaults to 0 and floors at 30", async () => {
  const { alertIntervalSec } = await import("../src/notify.js");
  const prev = process.env.TOKENPULSE_ALERT_WEBHOOK_INTERVAL_SEC;
  delete process.env.TOKENPULSE_ALERT_WEBHOOK_INTERVAL_SEC;
  assert.equal(alertIntervalSec(), 0);
  process.env.TOKENPULSE_ALERT_WEBHOOK_INTERVAL_SEC = "10";
  assert.equal(alertIntervalSec(), 30);
  process.env.TOKENPULSE_ALERT_WEBHOOK_INTERVAL_SEC = "120";
  assert.equal(alertIntervalSec(), 120);
  if (prev) process.env.TOKENPULSE_ALERT_WEBHOOK_INTERVAL_SEC = prev;
  else delete process.env.TOKENPULSE_ALERT_WEBHOOK_INTERVAL_SEC;
});
