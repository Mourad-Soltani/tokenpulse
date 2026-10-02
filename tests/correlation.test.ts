import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveRequestId, correlationStatus } from "../src/correlation.ts";
import { handleRequest } from "../src/gateway.ts";
import { readEvents } from "../src/ledger.ts";
import { eventDigest, sealEvent } from "../src/chain.ts";
import type { UsageEvent } from "../src/types.ts";

describe("correlation", () => {
  it("accepts a safe client id and generates otherwise", () => {
    assert.equal(resolveRequestId("req-abc_12"), "req-abc_12");
    assert.match(resolveRequestId("no"), /^tp_[a-f0-9]{32}$/);
    assert.match(resolveRequestId("bad id"), /^tp_[a-f0-9]{32}$/);
    const status = correlationStatus();
    assert.equal(status.inHashChain, false);
    assert.equal(status.storesRawPrompts, false);
  });

  it("does not change the hash body when requestId is present", () => {
    const base: UsageEvent = {
      id: "evt_1",
      timestamp: "2026-10-02T00:00:00.000Z",
      teamId: "ops",
      appId: "cli",
      model: "gpt-4o-mini",
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      estimatedCostUsd: 0,
      latencyMs: 1,
      decision: "allow",
      policyIds: ["model-open"],
    };
    const withId = { ...base, requestId: "req-abc_12" };
    assert.equal(eventDigest(base, ""), eventDigest(withId, ""));
    const sealed = sealEvent(withId, "");
    assert.equal(sealed.requestId, "req-abc_12");
    assert.equal(sealed.hash, eventDigest(base, ""));
  });

  it("echoes the id and writes it on the ledger", async () => {
    process.env.TOKENPULSE_MOCK_UPSTREAM = "1";
    process.env.TOKENPULSE_GATEWAY_TOKEN = "test-token";
    process.env.TOKENPULSE_LEDGER_DIR = await mkdtemp(join(tmpdir(), "tp-corr-"));
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
          authorization: "Bearer test-token",
          "x-tokenpulse-request-id": "pilot-req-1",
        },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "corr" }] }),
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("x-tokenpulse-request-id"), "pilot-req-1");
      const events = await readEvents();
      const hit = events.find((e) => e.requestId === "pilot-req-1");
      assert.ok(hit, "ledger event missing requestId");
    } finally {
      server.close();
    }
  });
});
