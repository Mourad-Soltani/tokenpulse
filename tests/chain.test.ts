import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendEvent, newEvent, readEvents, verifyChain } from "../src/ledger.ts";
import { eventDigest, sealEvent } from "../src/chain.ts";

function sample(over: Partial<Parameters<typeof newEvent>[0]> = {}) {
  return newEvent({
    teamId: "eng",
    appId: "bot",
    model: "gpt-4o-mini",
    promptTokens: 3,
    completionTokens: 4,
    totalTokens: 7,
    estimatedCostUsd: 0.001,
    latencyMs: 2,
    decision: "allow",
    policyIds: ["model-open"],
    ...over,
  });
}

describe("ledger chain", () => {
  before(async () => {
    process.env.TOKENPULSE_LEDGER_DIR = await mkdtemp(join(tmpdir(), "tp-chain-"));
    delete process.env.TOKENPULSE_LEDGER_DRIVER;
  });

  it("seals sequential events and verifies", async () => {
    await appendEvent(sample());
    await appendEvent(sample({ teamId: "finops" }));
    const all = await readEvents();
    assert.equal(all.length, 2);
    assert.ok(all[0].hash);
    assert.equal(all[0].prevHash, "");
    assert.equal(all[1].prevHash, all[0].hash);
    assert.equal(all[1].hash, eventDigest(all[1], all[1].prevHash ?? ""));
    const report = verifyChain(all);
    assert.equal(report.ok, true);
    assert.equal(report.checked, 2);
  });

  it("detects a broken hash", () => {
    const a = sealEvent(sample(), "");
    const b = sealEvent(sample({ teamId: "x" }), a.hash ?? "");
    const tampered = { ...b, hash: "deadbeef" };
    const report = verifyChain([a, tampered]);
    assert.equal(report.ok, false);
    assert.equal(report.brokenAt, tampered.id);
  });
});
