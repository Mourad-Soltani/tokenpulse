import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { evaluateRateLimit, rateStatus, resetRateLimiter } from "../src/ratelimit.ts";

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

describe("rate status", () => {
  beforeEach(() => {
    resetRateLimiter();
    delete process.env.TOKENPULSE_DEFAULT_RPM;
    delete process.env.TOKENPULSE_RATES_PATH;
    delete process.env.TOKENPULSE_RATE_WINDOW_MS;
    delete process.env.TOKENPULSE_RATE_WARN_RATIO;
  });

  it("reports remaining and warn without consuming extra hits", async () => {
    process.env.TOKENPULSE_DEFAULT_RPM = "5";
    process.env.TOKENPULSE_RATE_WINDOW_MS = "60000";
    process.env.TOKENPULSE_RATE_WARN_RATIO = "0.4";
    await evaluateRateLimit("status-team", "default", 10_000);
    await evaluateRateLimit("status-team", "default", 10_100);
    const before = await rateStatus(10_200);
    const row = before.find((r) => r.scope === "team" && r.id === "status-team");
    assert.ok(row);
    assert.equal(row!.used, 2);
    assert.equal(row!.capRpm, 5);
    assert.equal(row!.remaining, 3);
    assert.equal(row!.warn, true);
    assert.equal(row!.exhausted, false);
    const after = await rateStatus(10_300);
    const again = after.find((r) => r.scope === "team" && r.id === "status-team");
    assert.equal(again!.used, 2);
  });

  it("marks rpm 0 as exhausted warn", async () => {
    const dir = await mkdir(join(tmpdir(), `tp-rate-st-${Date.now()}`), { recursive: true });
    const path = join(dir, "rates.json");
    await writeFile(path, JSON.stringify({ teams: { blocked: { rpm: 0 } }, apps: { quiet: { rpm: 10 } } }));
    process.env.TOKENPULSE_RATES_PATH = path;
    const rows = await rateStatus();
    const blocked = rows.find((r) => r.id === "blocked");
    assert.ok(blocked);
    assert.equal(blocked!.exhausted, true);
    assert.equal(blocked!.warn, true);
    const quiet = rows.find((r) => r.id === "quiet");
    assert.ok(quiet);
    assert.equal(quiet!.warn, false);
  });
});
