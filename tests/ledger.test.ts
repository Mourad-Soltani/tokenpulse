import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendEvent, newEvent, readEvents, summarize } from "../src/ledger.ts";

describe("ledger", () => {
  before(async () => {
    process.env.TOKENPULSE_LEDGER_DIR = await mkdtemp(join(tmpdir(), "tp-ledger-"));
  });

  it("appends and summarizes events", async () => {
    const ev = newEvent({
      teamId: "eng",
      appId: "bot",
      model: "gpt-4o-mini",
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      estimatedCostUsd: 0.0001,
      latencyMs: 5,
      decision: "allow",
      policyIds: [],
    });
    await appendEvent(ev);
    const all = await readEvents();
    assert.equal(all.length, 1);
    assert.equal(all[0].teamId, "eng");
    const s = summarize(all);
    assert.equal(s.calls, 1);
    assert.equal(s.tokens, 30);
    assert.equal(s.byTeam.eng.calls, 1);
  });
});
