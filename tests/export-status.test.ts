import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { exportStatus, FINOPS_PACK_VERSION, SECURITY_PACK_VERSION } from "../src/export.ts";

describe("export pack status", () => {
  it("reports pack versions without event payloads or prompts", () => {
    const s = exportStatus();
    assert.equal(s.finopsVersion, FINOPS_PACK_VERSION);
    assert.equal(s.securityVersion, SECURITY_PACK_VERSION);
    assert.deepEqual(s.formats, ["json", "csv"]);
    assert.equal(s.includesRawPrompts, false);
    assert.equal(s.notesOmittedFromFinopsRows, true);
    const blob = JSON.stringify(s);
    assert.equal(blob.includes("prompt"), false);
    assert.equal(blob.includes("sk-"), false);
  });
});
