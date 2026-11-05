import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { seedDemoLedger } from "../src/seedDemo.js";
import { readEvents, verifyChain } from "../src/ledger.js";

test("seedDemoLedger appends chained events and a note", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tp-seed-"));
  const prev = process.env.TOKENPULSE_LEDGER_DIR;
  process.env.TOKENPULSE_LEDGER_DIR = dir;
  try {
    const result = await seedDemoLedger(2, 5);
    assert.equal(result.appended, 2 * 5 + 1);
    const events = await readEvents();
    assert.equal(events.length, 11);
    assert.ok(events.some((e) => e.decision === "note"));
    assert.ok(events.some((e) => e.decision === "allow"));
    const chain = verifyChain(events);
    assert.equal(chain.ok, true);
    assert.ok(chain.checked >= 11);
  } finally {
    if (prev === undefined) delete process.env.TOKENPULSE_LEDGER_DIR;
    else process.env.TOKENPULSE_LEDGER_DIR = prev;
    await rm(dir, { recursive: true, force: true });
  }
});
