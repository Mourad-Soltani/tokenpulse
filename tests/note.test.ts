import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendOperatorNote, readEvents, summarize, verifyChain } from "../src/ledger.ts";
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

describe("operator notes", () => {
  before(async () => {
    process.env.TOKENPULSE_LEDGER_DIR = await mkdtemp(join(tmpdir(), "tp-note-"));
    process.env.TOKENPULSE_MOCK_UPSTREAM = "1";
    delete process.env.TOKENPULSE_GATEWAY_TOKEN;
  });

  it("rejects empty notes", async () => {
    await assert.rejects(() => appendOperatorNote({ text: "   " }), /note_empty/);
  });

  it("appends a chained note without changing spend", async () => {
    const ev = await appendOperatorNote({ text: "  reviewed budget spike  ", teamId: "finance" });
    assert.equal(ev.decision, "note");
    assert.equal(ev.note, "reviewed budget spike");
    assert.equal(ev.estimatedCostUsd, 0);
    const all = await readEvents();
    const s = summarize(all);
    assert.ok(s.notes >= 1);
    assert.equal(s.costUsd, 0);
    const chain = verifyChain(all);
    assert.equal(chain.ok, true);
  });

  it("accepts POST /v1/admin/note", async () => {
    const { server, url } = await listen();
    try {
      const bad = await fetch(`${url}/v1/admin/note`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "" }),
      });
      assert.equal(bad.status, 400);
      const res = await fetch(`${url}/v1/admin/note`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "ciso acknowledged block", teamId: "sec" }),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as { ok: boolean; event: { decision: string; note?: string } };
      assert.equal(body.ok, true);
      assert.equal(body.event.decision, "note");
      assert.equal(body.event.note, "ciso acknowledged block");
    } finally {
      server.close();
    }
  });
});
