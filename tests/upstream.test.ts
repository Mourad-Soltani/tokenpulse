import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  isMockUpstream,
  liveChatCompletion,
  resolveUpstream,
  resolveUpstreamChain,
  withUpstreamFallback,
} from "../src/upstream.ts";
import { handleRequest } from "../src/gateway.ts";
import { readEvents } from "../src/ledger.ts";

describe("upstream resolve", () => {
  it("prefers explicit Tokenpulse env", () => {
    const cfg = resolveUpstream({
      TOKENPULSE_UPSTREAM_BASE_URL: "https://example.test/v1",
      TOKENPULSE_UPSTREAM_API_KEY: "k-explicit",
      OPENAI_API_KEY: "sk-openai",
    } as NodeJS.ProcessEnv);
    assert.deepEqual(cfg, {
      baseUrl: "https://example.test/v1",
      apiKey: "k-explicit",
      source: "tokenpulse",
    });
  });

  it("uses xAI then OpenAI defaults", () => {
    assert.equal(resolveUpstream({ XAI_API_KEY: "x" } as NodeJS.ProcessEnv)?.source, "xai");
    assert.equal(resolveUpstream({ OPENAI_API_KEY: "o" } as NodeJS.ProcessEnv)?.source, "openai");
    assert.equal(resolveUpstream({} as NodeJS.ProcessEnv), null);
  });

  it("chains explicit fallback without duplicating primary", () => {
    const chain = resolveUpstreamChain({
      TOKENPULSE_UPSTREAM_BASE_URL: "https://primary.test/v1",
      TOKENPULSE_UPSTREAM_API_KEY: "k1",
      TOKENPULSE_UPSTREAM_FALLBACK_BASE_URL: "https://backup.test/v1",
      TOKENPULSE_UPSTREAM_FALLBACK_API_KEY: "k2",
    } as NodeJS.ProcessEnv);
    assert.equal(chain.length, 2);
    assert.equal(chain[0].source, "tokenpulse");
    assert.equal(chain[1].source, "fallback");
    assert.equal(chain[1].baseUrl, "https://backup.test/v1");
  });

  it("parses mock flags", () => {
    assert.equal(isMockUpstream({ TOKENPULSE_MOCK_UPSTREAM: "yes" } as NodeJS.ProcessEnv), true);
    assert.equal(isMockUpstream({ TOKENPULSE_MOCK_UPSTREAM: "0" } as NodeJS.ProcessEnv), false);
  });
});

describe("withUpstreamFallback", () => {
  it("uses the second upstream when the first throws", async () => {
    const chain = [
      { baseUrl: "https://dead.test/v1", apiKey: "a", source: "tokenpulse" as const },
      { baseUrl: "https://ok.test/v1", apiKey: "b", source: "fallback" as const },
    ];
    let calls = 0;
    const out = await withUpstreamFallback(chain, async (cfg) => {
      calls += 1;
      if (cfg.source === "tokenpulse") throw Object.assign(new Error("primary down"), { status: 502 });
      return { ok: cfg.baseUrl };
    });
    assert.equal(calls, 2);
    assert.equal(out.used.source, "fallback");
    assert.equal(out.result.ok, "https://ok.test/v1");
    assert.equal(out.attempts[0].error, "primary down");
  });
});

describe("liveChatCompletion", () => {
  it("posts to /chat/completions and reads usage", async () => {
    const server = createServer((req, res) => {
      assert.equal(req.url, "/chat/completions");
      assert.equal(req.headers.authorization, "Bearer test-up");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl_live",
          object: "chat.completion",
          choices: [{ index: 0, message: { role: "assistant", content: "pong" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
        }),
      );
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no addr");
    try {
      const live = await liveChatCompletion(
        { model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] },
        { baseUrl: `http://127.0.0.1:${addr.port}`, apiKey: "test-up", source: "tokenpulse" },
      );
      assert.equal(live.usage.totalTokens, 5);
      assert.equal((live.body as { id: string }).id, "chatcmpl_live");
    } finally {
      server.close();
    }
  });
});

describe("gateway live path", () => {
  it("forwards when mock is off and ledgers live-allow", async () => {
    const upstream = createServer((req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl_fwd",
          object: "chat.completion",
          choices: [{ index: 0, message: { role: "assistant", content: "live" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 4, completion_tokens: 1, total_tokens: 5 },
        }),
      );
    });
    await new Promise<void>((r) => upstream.listen(0, "127.0.0.1", r));
    const uaddr = upstream.address();
    if (!uaddr || typeof uaddr === "string") throw new Error("no addr");

    process.env.TOKENPULSE_MOCK_UPSTREAM = "0";
    process.env.TOKENPULSE_GATEWAY_TOKEN = "test-token";
    process.env.TOKENPULSE_LEDGER_DIR = await mkdtemp(join(tmpdir(), "tp-live-"));
    process.env.TOKENPULSE_UPSTREAM_BASE_URL = `http://127.0.0.1:${uaddr.port}`;
    process.env.TOKENPULSE_UPSTREAM_API_KEY = "up-key";
    delete process.env.TOKENPULSE_BUDGETS_PATH;
    delete process.env.TOKENPULSE_DEFAULT_DAILY_USD;

    const gw = createServer((req, res) => {
      handleRequest(req, res).catch((e) => {
        res.statusCode = 500;
        res.end(String(e));
      });
    });
    await new Promise<void>((r) => gw.listen(0, "127.0.0.1", r));
    const gaddr = gw.address();
    if (!gaddr || typeof gaddr === "string") throw new Error("no addr");
    try {
      const res = await fetch(`http://127.0.0.1:${gaddr.port}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer test-token",
          "x-tokenpulse-team": "eng",
          "x-tokenpulse-app": "livebot",
        },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "forward me" }] }),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as { object: string; choices: { message: { content: string } }[] };
      assert.equal(body.object, "chat.completion");
      assert.equal(body.choices[0].message.content, "live");
      const events = await readEvents();
      assert.ok(events.some((e) => e.appId === "livebot" && e.decision === "allow" && e.policyIds.includes("live-allow")));
    } finally {
      gw.close();
      upstream.close();
      process.env.TOKENPULSE_MOCK_UPSTREAM = "1";
    }
  });
});
