import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ATTRIBUTION_FIELDS, attributionStatus } from "../src/attribution.ts";

describe("attribution status", () => {
  it("lists team and app headers without traffic values or keys", () => {
    const s = attributionStatus();
    assert.equal(s.version, "tokenpulse-attribution-v1");
    assert.equal(s.storesRawPrompts, false);
    assert.equal(s.fieldCount, ATTRIBUTION_FIELDS.length);
    assert.equal(s.fields.length, 2);
    assert.deepEqual(
      s.fields.map((f) => f.header),
      ["X-Tokenpulse-Team", "X-Tokenpulse-App"],
    );
    assert.deepEqual(
      s.fields.map((f) => f.ledgerField),
      ["teamId", "appId"],
    );
    for (const f of s.fields) {
      assert.equal(f.required, false);
      assert.equal(f.defaultValue, "default");
    }
    const blob = JSON.stringify(s);
    assert.equal(blob.includes("sk-"), false);
    assert.equal(/Bearer /.test(blob), false);
  });
});
