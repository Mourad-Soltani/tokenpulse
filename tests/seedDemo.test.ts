import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { seedDemoLedger } from "../src/seedDemo.ts";
import { readEvents, summarize } from "../src/ledger.ts";

describe("seedDemoLedger", () => {
  let dir: string;
  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "tp-seed-"));
    process.env.TOKENPULSE_LEDGER_DIR = dir;
    process.env.TOKENPULSE_LEDGER_DRIVER = "jsonl";
  });

  it("appends multi-day allow and block events", async () => {
    const result = await seedDemoLedger(3, 5);
    assert.equal(result.days, 3);
    assert.ok(result.appended >= 16); // 3*5 + note
    const events = await readEvents();
    assert.ok(events.length >= 16);
    const summary = summarize(events);
    assert.ok(summary.calls >= 15);
    assert.ok(summary.blocked >= 0);
    const hasNote = events.some((e) => e.decision === "note");
    assert.equal(hasNote, true);
  });
});
