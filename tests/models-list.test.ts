import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleRequest } from "../src/gateway.ts";
import { listVisibleModels } from "../src/models.ts";

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

describe("GET /v1/models", () => {
  before(async () => {
    process.env.TOKENPULSE_MOCK_UPSTREAM = "1";
    process.env.TOKENPULSE_GATEWAY_TOKEN = "test-token";
    process.env.TOKENPULSE_LEDGER_DIR = await mkdtemp(join(tmpdir(), "tp-models-"));
    const dir = await mkdtemp(join(tmpdir(), "tp-mp-"));
    const path = join(dir, "models.json");
    await writeFile(
      path,
      JSON.stringify({ allow: ["gpt-4o-mini", "text-embedding-3-small", "custom-pilot"], deny: ["grok-3"] }),
    );
    process.env.TOKENPULSE_MODELS_PATH = path;
    delete process.env.TOKENPULSE_MODEL_ALLOW;
    delete process.env.TOKENPULSE_MODEL_DENY;
  });

  it("filters catalog by allow/deny and includes extra allow-list ids", () => {
    const listed = listVisibleModels({
      allow: ["gpt-4o-mini", "text-embedding-3-small", "custom-pilot"],
      deny: ["grok-3"],
    });
    const ids = listed.map((m) => m.id);
    assert.deepEqual(ids, ["custom-pilot", "gpt-4o-mini", "text-embedding-3-small"]);
    assert.ok(!ids.includes("grok-3"));
    assert.ok(!ids.includes("gpt-4o"));
  });

  it("returns OpenAI list payload", async () => {
    const { server, url } = await listen();
    try {
      const res = await fetch(`${url}/v1/models`, {
        headers: { authorization: "Bearer test-token" },
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as { object: string; data: { id: string; object: string; owned_by: string }[] };
      assert.equal(body.object, "list");
      const ids = body.data.map((m) => m.id);
      assert.ok(ids.includes("gpt-4o-mini"));
      assert.ok(ids.includes("custom-pilot"));
      assert.ok(!ids.includes("grok-3"));
      assert.equal(body.data[0].object, "model");
      assert.equal(body.data[0].owned_by, "tokenpulse");
    } finally {
      server.close();
    }
  });

  it("requires gateway token when set", async () => {
    const { server, url } = await listen();
    try {
      const res = await fetch(`${url}/v1/models`);
      assert.equal(res.status, 401);
    } finally {
      server.close();
    }
  });
});
