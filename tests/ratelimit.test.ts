import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { evaluateRateLimit, resetRateLimiter } from "../src/ratelimit.ts";

describe("rate limit", () => {
  beforeEach(() => {
    resetRateLimiter();
    delete process.env.TOKENPULSE_DEFAULT_RPM;
    delete process.env.TOKENPULSE_RATES_PATH;
    delete process.env.TOKENPULSE_RATE_WINDOW_MS;
  });

  it("unlimited when no config", async () => {
    const d = await evaluateRateLimit("t1");
    assert.equal(d.allow, true);
    assert.equal(d.policyId, "rate-unlimited");
  });

  it("blocks after rpm cap", async () => {
    process.env.TOKENPULSE_DEFAULT_RPM = "2";
    process.env.TOKENPULSE_RATE_WINDOW_MS = "60000";
    const a = await evaluateRateLimit("t2", 1_000);
    const b = await evaluateRateLimit("t2", 1_100);
    const c = await evaluateRateLimit("t2", 1_200);
    assert.equal(a.allow, true);
    assert.equal(b.allow, true);
    assert.equal(c.allow, false);
    assert.equal(c.policyId, "rate-limited");
    assert.ok((c.retryAfterMs ?? 0) > 0);
  });

  it("rpm 0 hard-blocks", async () => {
    process.env.TOKENPULSE_DEFAULT_RPM = "0";
    const d = await evaluateRateLimit("t0");
    assert.equal(d.allow, false);
    assert.equal(d.capRpm, 0);
  });
});
