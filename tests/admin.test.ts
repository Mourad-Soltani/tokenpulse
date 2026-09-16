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
      const body = (await res.json()) as { allowed: number; byTeam: Record<string, { calls: number }> };
      assert.ok(body.allowed >= 1);
      assert.ok(body.byTeam.ops?.calls >= 1);

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
