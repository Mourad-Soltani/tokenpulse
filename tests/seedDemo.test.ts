import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { seedDemoLedger } from "../src/seedDemo.ts";
import { readEvents, summarize, verifyChain } from "../src/ledger.ts";
import { buildFinopsPack, buildSecurityPack, isDemoDataset } from "../src/export.ts";

describe("seedDemoLedger", () => {
  before(async () => {
    const dir = await mkdtemp(join(tmpdir(), "tp-seed-"));
    process.env.TOKENPULSE_LEDGER_DIR = dir;
    process.env.TOKENPULSE_LEDGER_DRIVER = "jsonl";
  });

  it("appends multi-day events with chain integrity and no future timestamps", async () => {
    const now = Date.now();
    const result = await seedDemoLedger(3, 5);
    assert.equal(result.days, 3);
    assert.ok(result.appended >= 16);
    const events = await readEvents();
    assert.ok(events.length >= 16);
    for (const e of events) {
      assert.ok(new Date(e.timestamp).getTime() <= now + 5000, "event must not be in the future: " + e.timestamp);
    }
    const chain = verifyChain(events);
    assert.equal(chain.ok, true);
    assert.ok(chain.checked >= 1);
    assert.equal(isDemoDataset(events), true);
    const fin = buildFinopsPack(events);
    assert.equal(fin.demoDataset, true);
    const sec = buildSecurityPack(events);
    assert.equal(sec.chainOk, true);
    assert.equal(sec.demoDataset, true);
    assert.ok(sec.chainChecked >= events.filter((e) => e.hash).length || sec.chainChecked >= 1);
  });
});
