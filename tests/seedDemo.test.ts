import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { seedDemoLedger } from "../src/seedDemo.ts";
import { readEvents, verifyChain, newEvent } from "../src/ledger.ts";
import { buildFinopsPack, buildSecurityPack, isDemoDataset } from "../src/export.ts";
import { sealEvent } from "../src/chain.ts";

describe("seedDemoLedger", () => {
  before(async () => {
    const dir = await mkdtemp(join(tmpdir(), "tp-seed-"));
    process.env.TOKENPULSE_LEDGER_DIR = dir;
    process.env.TOKENPULSE_LEDGER_DRIVER = "jsonl";
  });

  it("refuses re-seed without force", async () => {
    await seedDemoLedger({ days: 2, perDay: 3, mode: "demo", force: true });
    await assert.rejects(() => seedDemoLedger({ days: 1, perDay: 2 }), (err: Error & { code?: string }) => {
      assert.equal(err.code, "LEDGER_POPULATED");
      return true;
    });
  });

  it("enterprise force wipe + clean timestamps + chain", async () => {
    process.env.TOKENPULSE_BLOCKED_ASSUME_TOKENS = "2048";
    const result = await seedDemoLedger({ days: 3, perDay: 8, mode: "enterprise", force: true });
    assert.equal(result.mode, "enterprise");
    assert.equal(result.wiped, true);
    assert.ok(result.appended >= 10);
    const events = await readEvents();
    const now = Date.now() + 2000;
    for (const e of events) {
      const t = new Date(e.timestamp).getTime();
      assert.ok(t <= now, e.timestamp);
      if (e.decision !== "note") {
        assert.match(e.timestamp, /\d{2}:\d{2}:00\.000Z$/);
      }
    }
    // Genesis must store prevHash as empty string so verifyChain matches (Session 134 fix).
    assert.equal(events[0]?.prevHash, "");
    assert.ok(events[0]?.hash);
    const chain = verifyChain(events);
    assert.equal(chain.ok, true);
    assert.equal(isDemoDataset(events), true);
    const sec = buildSecurityPack(events);
    assert.equal(sec.chainOk, true);
    assert.equal(sec.demoDataset, true);
    const fin = buildFinopsPack(events);
    assert.equal(fin.demoDataset, true);
  });

  it("sealEvent coerces undefined prevHash to empty string", () => {
    const ev = newEvent({
      teamId: "test",
      appId: "test",
      model: "gpt-4o-mini",
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      estimatedCostUsd: 0,
      latencyMs: 1,
      decision: "allow",
      policyIds: ["allow"],
    });
    // Simulate the pre-Session-134 bug path.
    const sealed = sealEvent(ev, undefined as unknown as string);
    assert.equal(sealed.prevHash, "");
    assert.ok(sealed.hash);
  });
});
