import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mockChatCompletionStream } from "../src/mockUpstream.ts";
import { handleRequest } from "../src/gateway.ts";
import { readEvents } from "../src/ledger.ts";

describe("stream mock helper", () => {
  it("emits SSE chunks and DONE", () => {
    const s = mockChatCompletionStream({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "stream please" }],
      stream: true,
    });
    assert.ok(s.chunks.length >= 3);
    assert.ok(s.chunks.some((c) => c.includes("chat.completion.chunk")));
    assert.equal(s.chunks[s.chunks.length - 1], "data: [DONE]\n\n");
    assert.ok(s.usage.totalTokens > 0);
  });
});

describe("gateway streaming", () => {
  before(async () => {
    const dir = await mkdtemp(join(tmpdir(), "tp-stream-"));
    process.env.TOKENPULSE_LEDGER_DIR = dir;
    process.env.TOKENPULSE_MOCK_UPSTREAM = "1";
    process.env.TOKENPULSE_GATEWAY_TOKEN = "stream-token";
    delete process.env.TOKENPULSE_BUDGETS_PATH;
    delete process.env.TOKENPULSE_DEFAULT_DAILY_USD;
    delete process.env.TOKENPULSE_DEFAULT_MONTHLY_USD;
    delete process.env.TOKENPULSE_MODELS_PATH;
    delete process.env.TOKENPULSE_MODEL_ALLOW;
    delete process.env.TOKENPULSE_MODEL_DENY;
    delete process.env.TOKENPULSE_RATES_PATH;
    delete process.env.TOKENPULSE_DEFAULT_RPM;
    delete process.env.TOKENPULSE_LIMITS_PATH;
    process.env.TOKENPULSE_SENSITIVE = "off";
  });

  it("streams chat completions and ledgers allow+stream", async () => {
    const server = createServer((req, res) => {
      handleRequest(req, res).catch((e) => {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end(String(e));
        } else {
          res.end();
        }
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no addr");
    const port = addr.port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
        method: "POST",
        headers: {
          authorization: "Bearer stream-token",
          "content-type": "application/json",
          "x-tokenpulse-team": "stream-team",
          "x-tokenpulse-app": "stream-app",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          stream: true,
          messages: [{ role: "user", content: "hello stream" }],
        }),
      });
      assert.equal(res.status, 200);
      assert.match(res.headers.get("content-type") ?? "", /text\/event-stream/);
      const body = await res.text();
      assert.match(body, /chat\.completion\.chunk/);
      assert.match(body, /\[DONE\]/);
      const events = await readEvents();
      const last = events[events.length - 1];
      assert.equal(last?.decision, "allow");
      assert.ok(last?.policyIds.includes("stream"));
      assert.ok((last?.totalTokens ?? 0) > 0);
    } finally {
      server.close();
    }
  });
});
