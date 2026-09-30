import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { POLICY_STAGES, policyPipelineStatus } from "../src/policy.ts";

describe("policy pipeline status", () => {
  it("lists ordered stages without prompts or keys", () => {
    const s = policyPipelineStatus();
    assert.equal(s.version, "tokenpulse-policy-v1");
    assert.equal(s.storesRawPrompts, false);
    assert.equal(s.stageCount, POLICY_STAGES.length);
    assert.equal(s.stages.length, 7);
    assert.deepEqual(
      s.stages.map((st) => st.id),
      ["limits", "sensitive", "model", "remap", "rate", "budget", "upstream"],
    );
    for (let i = 0; i < s.stages.length; i++) {
      assert.equal(s.stages[i]!.order, i + 1);
    }
    const blob = JSON.stringify(s);
    assert.equal(blob.includes("sk-"), false);
    assert.equal(/Bearer /.test(blob), false);
  });
});
