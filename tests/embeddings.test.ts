import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleRequest } from "../src/gateway.ts";
import { readEvents } from "../src/ledger.ts";
import { priceFor } from "../src/pricing.ts";
import { mockEmbeddings } from "../src/mockUpstream.ts";

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

describe("embeddings", () => {
  before(async () => {
    process.env.TOKENPULSE_MOCK_UPSTREAM = "1";
    process.env.TOKENPULSE_GATEWAY_TOKEN = "test-token";
    process.env.TOKENPULSE_LEDGER_DIR = await mkdtemp(join(tmpdir(), "tp-emb-"));
    delete process.env.TOKENPULSE_MODELS_PATH;
    delete process.env.TOKENPULSE_MODEL_ALLOW;
    delete process.env.TOKENPULSE_MODEL_DENY;
    delete process.env.TOKENPULSE_BUDGETS_PATH;
    delete process.env.TOKENPULSE_DEFAULT_DAILY_USD;
  });

  it("prices embedding models as input-only", () => {
    assert.equal(priceFor("text-embedding-3-small").input, 0.02);
    assert.equal(priceFor("text-embedding-3-small").output, 0);
  });

  it("mocks a deterministic vector list", () => {
    const res = mockEmbeddings({ model: "text-embedding-3-small", input: ["alpha", "beta"] });
    assert.equal(res.body.object, "list");
    assert.equal((res.body.data as unknown[]).length, 2);
    assert.equal(res.usage.completionTokens, 0);
    assert.ok(res.usage.promptTokens >= 1);
  });

  it("meters embeddings through the gateway", async () => {
    const { server, url } = await listen();
    try {
      const res = await fetch(`${url}/v1/embeddings`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-token",
          "x-tokenpulse-team": "search",
          "x-tokenpulse-app": "rag",
        },
        body: JSON.stringify({ model: "text-embedding-3-small", input: "invoice 42" }),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        object: string;
        data: { embedding: number[] }[];
        usage: { prompt_tokens: number };
      };
      assert.equal(body.object, "list");
      assert.ok(body.data[0].embedding.length >= 4);
      const events = await readEvents();
      assert.ok(
        events.some(
          (e) =>
            e.teamId === "search" &&
            e.appId === "rag" &&
            e.decision === "allow" &&
            e.policyIds.includes("endpoint:embeddings"),
        ),
      );
    } finally {
      server.close();
    }
  });

  it("blocks sensitive embedding input", async () => {
    const { server, url } = await listen();
    try {
      const res = await fetch(`${url}/v1/embeddings`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-token",
          "x-tokenpulse-team": "search",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: "rotate sk-abcdefghijklmnopqrstuvwxyz0123",
        }),
      });
      assert.equal(res.status, 403);
      const body = (await res.json()) as { error: { type: string } };
      assert.equal(body.error.type, "sensitive_payload");
    } finally {
      server.close();
    }
  });
});
