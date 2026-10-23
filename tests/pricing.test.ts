import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { estimateCostUsd, priceFor, pricingStatus } from "../src/pricing.ts";

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

  it("exposes catalog status without secrets", () => {
    const s = pricingStatus();
    assert.equal(s.unit, "usd_per_million_tokens");
    assert.ok(s.catalogCount >= 1);
    assert.equal(s.rows.length, s.catalogCount);
    assert.equal(s.fallback.input, 1);
    assert.ok(s.rows.some((r) => r.model === "gpt-4o-mini" && r.known));
  });
});

import { loadPricingOverrides, pricingPath } from "../src/pricing.ts";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";

describe("pricing overrides", () => {
  it("applies file overrides when loaded", async () => {
    const dir = join(process.cwd(), "tmp-test-pricing");
    await mkdir(dir, { recursive: true });
    const path = join(dir, "pricing.json");
    process.env.TOKENPULSE_PRICING_PATH = path;
    await writeFile(path, JSON.stringify({ "gpt-4o-mini": { input: 0.1, output: 0.4 }, "new-model": { input: 9, output: 30 } }));
    await loadPricingOverrides();
    const p = priceFor("gpt-4o-mini");
    assert.equal(p.input, 0.1);
    const np = priceFor("new-model");
    assert.equal(np.input, 9);
    const s = pricingStatus();
    assert.equal(s.overrideCount, 2);
    assert.ok(s.rows.some((r) => r.model === "new-model"));
    delete process.env.TOKENPULSE_PRICING_PATH;
    await unlink(path).catch(() => {});
    // reset
    await loadPricingOverrides();
  });
});
