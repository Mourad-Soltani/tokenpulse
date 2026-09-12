import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateCostUsd, priceFor } from "../src/pricing.ts";

describe("pricing", () => {
  it("uses known table for gpt-4o-mini", () => {
    const p = priceFor("gpt-4o-mini");
    assert.equal(p.input, 0.15);
    const cost = estimateCostUsd("gpt-4o-mini", 1_000_000, 0);
    assert.equal(cost, 0.15);
  });

  it("falls back for unknown models", () => {
    const p = priceFor("mystery-model");
    assert.equal(p.input, 1);
  });
});
