import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateModel, modelStatus } from "../src/models.ts";

describe("model policy", () => {
  it("allows any model when lists are empty", () => {
    const d = evaluateModel("anything", {});
    assert.equal(d.allow, true);
    assert.equal(d.policyId, "model-open");
  });

  it("denies listed models even if also allowed", () => {
    const d = evaluateModel("gpt-4", { allow: ["gpt-4", "gpt-4o-mini"], deny: ["gpt-4"] });
    assert.equal(d.allow, false);
    assert.equal(d.policyId, "model-deny");
  });

  it("rejects models missing from a non-empty allow list", () => {
    const d = evaluateModel("claude-3", { allow: ["gpt-4o-mini"] });
    assert.equal(d.allow, false);
    assert.equal(d.policyId, "model-allowlist");
  });

  it("allows models on the allow list", () => {
    const d = evaluateModel("gpt-4o-mini", { allow: ["gpt-4o-mini"] });
    assert.equal(d.allow, true);
    assert.equal(d.policyId, "model-allowlist");
  });
});

describe("model status", () => {
  it("reports open mode when lists are empty", () => {
    const s = modelStatus({});
    assert.equal(s.mode, "open");
    assert.equal(s.allow.length, 0);
    assert.equal(s.deny.length, 0);
    assert.ok(s.visibleCount >= 1);
  });

  it("lists remaps excluding identity maps", () => {
    const s = modelStatus({
      allow: ["gpt-4o-mini"],
      deny: ["gpt-4"],
      remap: { "gpt-4o": "gpt-4o-mini", "same": "same" },
    });
    assert.equal(s.mode, "allow+deny");
    assert.deepEqual(s.remaps, [{ from: "gpt-4o", to: "gpt-4o-mini" }]);
  });
});
