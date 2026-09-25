import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseRemapCsv, resolveRemap } from "../src/models.ts";

describe("model remap", () => {
  it("parses from:to pairs and last pair wins", () => {
    const map = parseRemapCsv("gpt-4:gpt-4o-mini, grok-2:grok-2-mini, gpt-4:gpt-4o");
    assert.equal(map["gpt-4"], "gpt-4o");
    assert.equal(map["grok-2"], "grok-2-mini");
  });

  it("skips malformed pairs", () => {
    const map = parseRemapCsv(":empty,onlyfrom:,ok:yes");
    assert.deepEqual(map, { ok: "yes" });
  });

  it("is identity when no mapping", () => {
    const r = resolveRemap("gpt-4o", { remap: { "gpt-4": "gpt-4o-mini" } });
    assert.equal(r.remapped, false);
    assert.equal(r.upstreamModel, "gpt-4o");
  });

  it("rewrites only after an explicit map", () => {
    const r = resolveRemap("gpt-4", { remap: { "gpt-4": "gpt-4o-mini" } });
    assert.equal(r.remapped, true);
    assert.equal(r.upstreamModel, "gpt-4o-mini");
    assert.equal(r.policyId, "remap:gpt-4:gpt-4o-mini");
  });
});
