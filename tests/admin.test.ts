import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleRequest } from "../src/gateway.ts";

async function listen() {
  const server = createServer((req, res) => {
    handleRequest(req, res).catch((e) => {
      res.statusCode = 500;
      res.end(String(e));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no addr");
  return { server, url: `http://127.0.0.1:${addr.port}` };
}

describe("admin api", () => {
  before(async () => {
    process.env.TOKENPULSE_MOCK_UPSTREAM = "1";
    process.env.TOKENPULSE_GATEWAY_TOKEN = "test-token";
    process.env.TOKENPULSE_LEDGER_DIR = await mkdtemp(join(tmpdir(), "tp-admin-"));
    delete process.env.TOKENPULSE_DEFAULT_DAILY_USD;
    delete process.env.TOKENPULSE_BUDGETS_PATH;
    delete process.env.TOKENPULSE_MODELS_PATH;
    delete process.env.TOKENPULSE_MODEL_ALLOW;
    delete process.env.TOKENPULSE_MODEL_DENY;
  });

  it("requires token for summary", async () => {
    const { server, url } = await listen();
    try {
      const res = await fetch(`${url}/v1/admin/summary`);
      assert.equal(res.status, 401);
    } finally {
      server.close();
    }
  });

  it("serves dashboard html", async () => {
    const { server, url } = await listen();
    try {
      const res = await fetch(`${url}/`, { headers: { authorization: "Bearer test-token" } });
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.match(text, /Tokenpulse/);
      assert.match(text, /Sensitive payload/);
      assert.match(text, /Ledger/);
      assert.match(text, /Pricing catalog/);
      assert.match(text, />Gateway</);
      assert.match(text, /Export packs/);
      assert.match(res.headers.get("content-type") ?? "", /text\/html/);
    } finally {
      server.close();
    }
  });

  it("summarizes allow + block after a call", async () => {
    const { server, url } = await listen();
    try {
      await fetch(`${url}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-token",
          "x-tokenpulse-team": "ops",
          "x-tokenpulse-app": "cli",
        },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] }),
      });
      const res = await fetch(`${url}/v1/admin/summary`, {
        headers: { authorization: "Bearer test-token" },
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        allowed: number;
        byTeam: Record<string, { calls: number }>;
        byApp: Record<string, { calls: number }>;
        budgets: unknown[];
        budgetWarns: number;
        limits: unknown[];
        limitWarns: number;
        upstreams: { mock: boolean; hops: unknown[] };
        models: { mode: string; allow: string[]; deny: string[]; remaps: unknown[] };
        sensitive: { mode: string; categories: string[]; extraPatterns: number };
        ledger: { driver: string; events: number; chainOk: boolean; chainChecked: number; skippedLegacy: number };
        pricing: { unit: string; catalogCount: number; fallback: { input: number; output: number }; rows: unknown[] };
        gateway: { host: string; port: number; mockUpstream: boolean; authRequired: boolean; loopback: boolean };
        exports: { finopsVersion: string; securityVersion: string; formats: string[]; includesRawPrompts: boolean };
      };
      assert.ok(body.allowed >= 1);
      assert.ok(body.byTeam.ops?.calls >= 1);
      assert.ok(body.byApp.cli?.calls >= 1);
      assert.ok(Array.isArray(body.budgets));
      assert.equal(typeof body.budgetWarns, "number");
      assert.ok(Array.isArray(body.limits));
      assert.equal(typeof body.limitWarns, "number");
      assert.equal(typeof body.upstreams.mock, "boolean");
      assert.ok(Array.isArray(body.upstreams.hops));
      assert.equal(typeof body.models.mode, "string");
      assert.ok(Array.isArray(body.models.allow));
      assert.ok(Array.isArray(body.models.deny));
      assert.ok(Array.isArray(body.models.remaps));
      assert.equal(typeof body.sensitive.mode, "string");
      assert.ok(Array.isArray(body.sensitive.categories));
      assert.equal(typeof body.sensitive.extraPatterns, "number");
      assert.equal(typeof body.ledger.driver, "string");
      assert.equal(typeof body.ledger.events, "number");
      assert.equal(typeof body.ledger.chainOk, "boolean");
      assert.equal(typeof body.ledger.chainChecked, "number");
      assert.equal(typeof body.ledger.skippedLegacy, "number");
      assert.equal(body.pricing.unit, "usd_per_million_tokens");
      assert.ok(body.pricing.catalogCount >= 1);
      assert.ok(Array.isArray(body.pricing.rows));
      assert.equal(typeof body.pricing.fallback.input, "number");
      assert.equal(typeof body.gateway.host, "string");
      assert.equal(typeof body.gateway.port, "number");
      assert.equal(typeof body.gateway.mockUpstream, "boolean");
      assert.equal(body.gateway.authRequired, true);
      assert.ok(!JSON.stringify(body.gateway).includes("test-token"));
      assert.equal(body.exports.finopsVersion, "tokenpulse-finops-v1");
      assert.equal(body.exports.securityVersion, "tokenpulse-security-v1");
      assert.ok(body.exports.formats.includes("json"));
      assert.equal(body.exports.includesRawPrompts, false);

      const fin = await fetch(`${url}/v1/admin/export/finops`, {
        headers: { authorization: "Bearer test-token" },
      });
      assert.equal(fin.status, 200);
      const pack = (await fin.json()) as { version: string; events: unknown[] };
      assert.equal(pack.version, "tokenpulse-finops-v1");
      assert.ok(pack.events.length >= 1);

      const sec = await fetch(`${url}/v1/admin/export/security`, {
        headers: { authorization: "Bearer test-token" },
      });
      assert.equal(sec.status, 200);
      const sp = (await sec.json()) as { version: string };
      assert.equal(sp.version, "tokenpulse-security-v1");
    } finally {
      server.close();
    }
  });
});
