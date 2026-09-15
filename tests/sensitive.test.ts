import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { createServer } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evaluateSensitive, scanText } from "../src/sensitive.ts";
import { handleRequest } from "../src/gateway.ts";
import { readEvents } from "../src/ledger.ts";

describe("sensitive heuristics", () => {
  it("flags secrets without returning the match text", () => {
    const hits = scanText("rotate github_pat_abcdefghijklmnopqrstuvwxyz0123456789");
    assert.deepEqual(hits.map((h) => h.category), ["secret"]);
  });

  it("flags email as pii", () => {
    const hits = scanText("contact cfo@acme.example");
    assert.ok(hits.some((h) => h.category === "pii"));
  });

  it("allows clean text", () => {
    const d = evaluateSensitive([{ content: "summarize yesterday close" }]);
    assert.equal(d.allow, true);
    assert.equal(d.policyId, "sensitive-clear");
  });

  it("can be disabled", () => {
    process.env.TOKENPULSE_SENSITIVE = "off";
    const d = evaluateSensitive([{ content: "sk-abcdefghijklmnopqrstuvwxyz" }]);
    assert.equal(d.allow, true);
    assert.equal(d.policyId, "sensitive-off");
    delete process.env.TOKENPULSE_SENSITIVE;
  });
});

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

describe("gateway sensitive block", () => {
  const prev: Record<string, string | undefined> = {};
  beforeEach(async () => {
    for (const k of [
      "TOKENPULSE_MOCK_UPSTREAM",
      "TOKENPULSE_GATEWAY_TOKEN",
      "TOKENPULSE_LEDGER_DIR",
      "TOKENPULSE_SENSITIVE",
      "TOKENPULSE_MODELS_PATH",
      "TOKENPULSE_MODEL_ALLOW",
      "TOKENPULSE_MODEL_DENY",
    ]) {
      prev[k] = process.env[k];
    }
    process.env.TOKENPULSE_MOCK_UPSTREAM = "1";
    process.env.TOKENPULSE_GATEWAY_TOKEN = "test-token";
    process.env.TOKENPULSE_LEDGER_DIR = await mkdtemp(join(tmpdir(), "tp-sens-"));
    delete process.env.TOKENPULSE_SENSITIVE;
    delete process.env.TOKENPULSE_MODEL_ALLOW;
    delete process.env.TOKENPULSE_MODEL_DENY;
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("blocks and ledgers without storing the prompt", async () => {
    const { server, url } = await listen();
    try {
      const secret = "sk-abcdefghijklmnopqrstuvwxyz0123";
      const res = await fetch(`${url}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-token",
          "x-tokenpulse-team": "secops",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: `key ${secret}` }],
        }),
      });
      assert.equal(res.status, 403);
      const body = (await res.json()) as { error: { type: string; categories: string[] } };
      assert.equal(body.error.type, "sensitive_payload");
      assert.ok(body.error.categories.includes("secret"));
      const events = await readEvents();
      const blocked = events.filter((e) => e.policyIds.includes("sensitive-block"));
      assert.equal(blocked.length, 1);
      assert.equal(blocked[0].decision, "block");
      const dumped = JSON.stringify(blocked[0]);
      assert.equal(dumped.includes(secret), false);
    } finally {
      server.close();
    }
  });
});
