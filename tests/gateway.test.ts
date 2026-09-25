import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleRequest } from "../src/gateway.ts";
import { readEvents } from "../src/ledger.ts";

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

describe("gateway", () => {
  before(async () => {
    process.env.TOKENPULSE_MOCK_UPSTREAM = "1";
    process.env.TOKENPULSE_GATEWAY_TOKEN = "test-token";
    process.env.TOKENPULSE_LEDGER_DIR = await mkdtemp(join(tmpdir(), "tp-gw-"));
  });

  it("health is open", async () => {
    const { server, url } = await listen();
    try {
      const res = await fetch(`${url}/health`);
      assert.equal(res.status, 200);
      const body = (await res.json()) as { ok: boolean };
      assert.equal(body.ok, true);
    } finally {
      server.close();
    }
  });

  it("rejects missing token", async () => {
    const { server, url } = await listen();
    try {
      const res = await fetch(`${url}/v1/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] }),
      });
      assert.equal(res.status, 401);
    } finally {
      server.close();
    }
  });

  it("mocks chat completions and writes ledger", async () => {
    const { server, url } = await listen();
    try {
      const res = await fetch(`${url}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-token",
          "x-tokenpulse-team": "finance",
          "x-tokenpulse-app": "closebot",
        },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hello ledger" }] }),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as { object: string; usage: { total_tokens: number }; choices: { message: { content: string } }[] };
      assert.equal(body.object, "chat.completion");
      assert.ok(body.usage.total_tokens > 0);
      assert.match(body.choices[0].message.content, /tokenpulse-mock/);
      const events = await readEvents();
      assert.ok(events.some((e) => e.teamId === "finance" && e.appId === "closebot" && e.decision === "allow"));
    } finally {
      server.close();
    }
  });

  it("blocks when daily cap is zero and ledgers block", async () => {
    const dir = process.env.TOKENPULSE_LEDGER_DIR!;
    process.env.TOKENPULSE_BUDGETS_PATH = join(dir, "budgets-zero.json");
    await writeFile(
      process.env.TOKENPULSE_BUDGETS_PATH,
      JSON.stringify({ teams: { capped: { dailyUsd: 0 } } }),
      "utf8",
    );
    const { server, url } = await listen();
    try {
      const res = await fetch(`${url}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-token",
          "x-tokenpulse-team": "capped",
          "x-tokenpulse-app": "bot",
        },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "should block" }] }),
      });
      assert.equal(res.status, 429);
      const body = (await res.json()) as { error: { type: string } };
      assert.equal(body.error.type, "budget_exceeded");
      const events = await readEvents();
      assert.ok(events.some((e) => e.teamId === "capped" && e.decision === "block"));
    } finally {
      server.close();
    }
  });

  it("blocks denied models with 403 and ledgers block", async () => {
    const dir = process.env.TOKENPULSE_LEDGER_DIR!;
    process.env.TOKENPULSE_MODELS_PATH = join(dir, "models-deny.json");
    await writeFile(
      process.env.TOKENPULSE_MODELS_PATH,
      JSON.stringify({ deny: ["banned-model"] }),
      "utf8",
    );
    const { server, url } = await listen();
    try {
      const res = await fetch(`${url}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-token",
          "x-tokenpulse-team": "sec",
          "x-tokenpulse-app": "bot",
        },
        body: JSON.stringify({ model: "banned-model", messages: [{ role: "user", content: "nope" }] }),
      });
      assert.equal(res.status, 403);
      const body = (await res.json()) as { error: { type: string } };
      assert.equal(body.error.type, "model_denied");
      const events = await readEvents();
      assert.ok(events.some((e) => e.model === "banned-model" && e.decision === "block"));
    } finally {
      server.close();
    }
  });

  it("remaps client model for mock upstream and tags ledger", async () => {
    process.env.TOKENPULSE_MODEL_REMAP = "gpt-4o:gpt-4o-mini";
    delete process.env.TOKENPULSE_MODEL_ALLOW;
    delete process.env.TOKENPULSE_MODEL_DENY;
    const { server, url } = await listen();
    try {
      const res = await fetch(`${url}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-token",
          "x-tokenpulse-team": "plat",
          "x-tokenpulse-app": "router",
        },
        body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: "remap me" }] }),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as { model: string; choices: { message: { content: string } }[] };
      assert.equal(body.model, "gpt-4o-mini");
      assert.match(body.choices[0].message.content, /gpt-4o-mini/);
      const events = await readEvents();
      const hit = events.find((e) => e.teamId === "plat" && e.appId === "router" && e.decision === "allow");
      assert.ok(hit);
      assert.equal(hit!.model, "gpt-4o");
      assert.ok(hit!.policyIds.includes("model-remap"));
      assert.ok(hit!.policyIds.includes("remap:gpt-4o:gpt-4o-mini"));
    } finally {
      delete process.env.TOKENPULSE_MODEL_REMAP;
      server.close();
    }
  });
});
