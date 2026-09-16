import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FINOPS_PACK_VERSION,
  SECURITY_PACK_VERSION,
  buildFinopsPack,
  buildSecurityPack,
  finopsCsv,
  securityCsv,
} from "../src/export.ts";
import type { UsageEvent } from "../src/types.ts";

const allow: UsageEvent = {
  id: "evt_a",
  timestamp: "2026-09-16T10:00:00.000Z",
  teamId: "ops",
  appId: "cli",
  model: "gpt-4o-mini",
  promptTokens: 10,
  completionTokens: 5,
  totalTokens: 15,
  estimatedCostUsd: 0.0001,
  latencyMs: 12,
  decision: "allow",
  policyIds: ["model-open"],
  requestHash: "abc",
};

const block: UsageEvent = {
  id: "evt_b",
  timestamp: "2026-09-16T10:01:00.000Z",
  teamId: "ops",
  appId: "cli",
  model: "banned-model",
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  estimatedCostUsd: 0,
  latencyMs: 2,
  decision: "block",
  policyIds: ["model-denied"],
  requestHash: "def",
};

describe("export packs", () => {
  it("builds a finops pack without raw prompts", () => {
    const pack = buildFinopsPack([allow, block], { day: "2026-09-16", now: "2026-09-16T12:00:00.000Z" });
    assert.equal(pack.version, FINOPS_PACK_VERSION);
    assert.equal(pack.summary.calls, 2);
    assert.equal(pack.summary.blocked, 1);
    assert.equal(pack.events.length, 2);
    assert.equal("latencyMs" in pack.events[0], false);
    const raw = JSON.stringify(pack);
    assert.doesNotMatch(raw, /prompt/);
  });

  it("builds a security pack of blocked events only", () => {
    const pack = buildSecurityPack([allow, block], { now: "2026-09-16T12:00:00.000Z" });
    assert.equal(pack.version, SECURITY_PACK_VERSION);
    assert.equal(pack.blocked, 1);
    assert.equal(pack.allowed, 1);
    assert.equal(pack.policyHits["model-denied"], 1);
    assert.equal(pack.blockedByTeam.ops, 1);
    assert.equal(pack.events.length, 1);
    assert.equal(pack.events[0].id, "evt_b");
  });

  it("emits csv rows", () => {
    const fin = finopsCsv(buildFinopsPack([allow]));
    assert.match(fin, /^id,timestamp,teamId/);
    assert.match(fin, /evt_a/);
    const sec = securityCsv(buildSecurityPack([allow, block]));
    assert.match(sec, /model-denied/);
    assert.match(sec, /evt_b/);
    assert.doesNotMatch(sec, /evt_a/);
  });
});
