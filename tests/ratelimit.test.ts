import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
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
    assert.equal(d.scope, "none");
  });

  it("blocks after rpm cap", async () => {
    process.env.TOKENPULSE_DEFAULT_RPM = "2";
    process.env.TOKENPULSE_RATE_WINDOW_MS = "60000";
    const a = await evaluateRateLimit("t2", "default", 1_000);
    const b = await evaluateRateLimit("t2", "default", 1_100);
    const c = await evaluateRateLimit("t2", "default", 1_200);
    assert.equal(a.allow, true);
    assert.equal(b.allow, true);
    assert.equal(c.allow, false);
    assert.equal(c.policyId, "rate-limited");
    assert.equal(c.scope, "team");
    assert.ok((c.retryAfterMs ?? 0) > 0);
  });

  it("rpm 0 hard-blocks", async () => {
    process.env.TOKENPULSE_DEFAULT_RPM = "0";
    const d = await evaluateRateLimit("t0");
    assert.equal(d.allow, false);
    assert.equal(d.capRpm, 0);
    assert.equal(d.scope, "team");
  });

  it("blocks after app rpm cap when team still has room", async () => {
    const dir = await mkdir(join(tmpdir(), `tp-rate-${Date.now()}`), { recursive: true });
    const path = join(dir, "rates.json");
    await writeFile(
      path,
      JSON.stringify({
        windowMs: 60_000,
        teams: { t3: { rpm: 10 } },
        apps: { noisy: { rpm: 1 } },
      }),
    );
    process.env.TOKENPULSE_RATES_PATH = path;
    const a = await evaluateRateLimit("t3", "noisy", 2_000);
    const b = await evaluateRateLimit("t3", "noisy", 2_100);
    assert.equal(a.allow, true);
    assert.equal(b.allow, false);
    assert.equal(b.policyId, "rate-limited-app");
    assert.equal(b.scope, "app");
    assert.equal(b.appId, "noisy");
  });
});
