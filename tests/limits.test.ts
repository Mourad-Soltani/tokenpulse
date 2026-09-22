import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { handleRequest } from "../src/gateway.ts";
import { capsForTeam, evaluateLimits, loadLimits, promptCharCount } from "../src/limits.ts";
import { readEvents } from "../src/ledger.ts";

describe("limits", () => {
  before(async () => {
    const dir = await mkdtemp(join(tmpdir(), "tp-limits-"));
    process.env.TOKENPULSE_LIMITS_PATH = join(dir, "limits.json");
    delete process.env.TOKENPULSE_MAX_PROMPT_CHARS;
    delete process.env.TOKENPULSE_MAX_TOKENS;
    await writeFile(
      process.env.TOKENPULSE_LIMITS_PATH,
      JSON.stringify({
        defaultMaxPromptChars: 100,
        defaultMaxTokens: 50,
        teams: { tight: { maxPromptChars: 10, maxTokens: 8 }, zero: { maxTokens: 0 } },
        apps: { tiny: { maxPromptChars: 5, maxTokens: 4 }, appoff: { maxTokens: 0 } },
      }),
      "utf8",
    );
  });

  it("counts prompt characters", () => {
    assert.equal(promptCharCount([{ content: "ab" }, { content: "c" }]), 3);
    assert.equal(promptCharCount(["xy", "z"]), 3);
  });

  it("loads team overrides", async () => {
    const cfg = await loadLimits();
    assert.deepEqual(capsForTeam(cfg, "tight"), { maxPromptChars: 10, maxTokens: 8 });
    assert.deepEqual(capsForTeam(cfg, "other"), { maxPromptChars: 100, maxTokens: 50 });
  });

  it("blocks oversized prompts", async () => {
    const d = await evaluateLimits({ teamId: "tight", promptChars: 11 });
    assert.equal(d.allow, false);
    assert.equal(d.policyId, "limit-prompt-chars");
  });

  it("blocks requested max_tokens above cap", async () => {
    const d = await evaluateLimits({ teamId: "tight", promptChars: 2, requestedMaxTokens: 9 });
    assert.equal(d.allow, false);
    assert.equal(d.policyId, "limit-max-tokens");
  });

  it("blocks maxTokens 0", async () => {
    const d = await evaluateLimits({ teamId: "zero", promptChars: 1 });
    assert.equal(d.allow, false);
    assert.equal(d.policyId, "limit-max-tokens");
  });

  it("allows under cap", async () => {
    const d = await evaluateLimits({ teamId: "tight", promptChars: 10, requestedMaxTokens: 8 });
    assert.equal(d.allow, true);
    assert.equal(d.policyId, "limit-ok");
    assert.equal(d.scope, "team");
  });

  it("blocks oversized prompts for app after team allows", async () => {
    const d = await evaluateLimits({ teamId: "other", appId: "tiny", promptChars: 6 });
    assert.equal(d.allow, false);
    assert.equal(d.policyId, "limit-prompt-chars-app");
    assert.equal(d.scope, "app");
  });

  it("blocks app maxTokens 0", async () => {
    const d = await evaluateLimits({ teamId: "other", appId: "appoff", promptChars: 1 });
    assert.equal(d.allow, false);
    assert.equal(d.policyId, "limit-max-tokens-app");
    assert.equal(d.scope, "app");
  });

  it("gateway returns 413 limit_exceeded", async () => {
    process.env.TOKENPULSE_MOCK_UPSTREAM = "1";
    process.env.TOKENPULSE_GATEWAY_TOKEN = "lim-token";
    process.env.TOKENPULSE_LEDGER_DIR = await mkdtemp(join(tmpdir(), "tp-lim-led-"));
    const server = createServer((req, res) => {
      handleRequest(req, res).catch((e) => {
        res.statusCode = 500;
        res.end(String(e));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no addr");
    const url = `http://127.0.0.1:${addr.port}`;
    try {
      const res = await fetch(`${url}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer lim-token",
          "x-tokenpulse-team": "tight",
          "x-tokenpulse-app": "default",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "this prompt is way over ten chars" }],
        }),
      });
      assert.equal(res.status, 413);
      const body = (await res.json()) as { error: { type: string } };
      assert.equal(body.error.type, "limit_exceeded");
      const events = await readEvents();
      assert.ok(events.some((e) => e.decision === "block" && e.policyIds.includes("limit-prompt-chars")));
    } finally {
      server.close();
    }
  });
});
