import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendEvent, newEvent, readEvents, summarize } from "../src/ledger.ts";
import { resetSqliteConnection } from "../src/sqliteLedger.ts";

describe("sqlite ledger", () => {
  before(async () => {
    const dir = await mkdtemp(join(tmpdir(), "tp-sqlite-"));
    process.env.TOKENPULSE_LEDGER_DRIVER = "sqlite";
    process.env.TOKENPULSE_SQLITE_PATH = join(dir, "ledger.sqlite");
    resetSqliteConnection();
  });

  after(() => {
    delete process.env.TOKENPULSE_LEDGER_DRIVER;
    delete process.env.TOKENPULSE_SQLITE_PATH;
    resetSqliteConnection();
  });

  it("appends, filters by day, and summarizes", async () => {
    const ev = newEvent({
      teamId: "finops",
      appId: "gateway",
      model: "gpt-4o-mini",
      promptTokens: 8,
      completionTokens: 12,
      totalTokens: 20,
      estimatedCostUsd: 0.0002,
      latencyMs: 4,
      decision: "allow",
      policyIds: ["model-open"],
      requestHash: "abcd",
      timestamp: "2026-09-16T08:00:00.000Z",
    });
    await appendEvent(ev);
    const other = newEvent({
      teamId: "finops",
      appId: "gateway",
      model: "gpt-4o-mini",
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      estimatedCostUsd: 0,
      latencyMs: 1,
      decision: "block",
      policyIds: ["rate-limited"],
      timestamp: "2026-09-15T08:00:00.000Z",
    });
    await appendEvent(other);

    const day = await readEvents({ day: "2026-09-16" });
    assert.equal(day.length, 1);
    assert.equal(day[0].teamId, "finops");
    assert.equal(day[0].requestHash, "abcd");

    const all = await readEvents();
    assert.equal(all.length, 2);
    const s = summarize(all);
    assert.equal(s.calls, 2);
    assert.equal(s.allowed, 1);
    assert.equal(s.blocked, 1);
    assert.equal(s.tokens, 22);
  });
});
