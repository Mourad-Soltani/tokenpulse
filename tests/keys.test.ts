import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { keyStatus, matchClientKey, sha256Hex } from "../src/keys.js";

async function withKeys(body: unknown, fn: () => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "tp-keys-"));
  const path = join(dir, "keys.json");
  await writeFile(path, JSON.stringify(body));
  const prev = process.env.TOKENPULSE_KEYS_PATH;
  process.env.TOKENPULSE_KEYS_PATH = path;
  try {
    await fn();
  } finally {
    if (prev === undefined) delete process.env.TOKENPULSE_KEYS_PATH;
    else process.env.TOKENPULSE_KEYS_PATH = prev;
  }
}

test("client key binds team and app; digest is not returned", async () => {
  const token = "pilot-client-secret";
  await withKeys(
    {
      keys: [
        {
          id: "finance-bot",
          tokenSha256: sha256Hex(token),
          teamId: "finance",
          appId: "bot",
        },
      ],
    },
    async () => {
      const hit = await matchClientKey(token);
      assert.deepEqual(hit, { id: "finance-bot", teamId: "finance", appId: "bot" });
      assert.equal(await matchClientKey("other"), undefined);
      const status = await keyStatus();
      assert.equal(status.configured, true);
      assert.equal(status.enabledCount, 1);
      assert.equal(status.storesTokenMaterial, false);
      assert.equal(JSON.stringify(status).includes(sha256Hex(token)), false);
      assert.equal(JSON.stringify(status).includes(token), false);
    },
  );
});

test("disabled keys do not match", async () => {
  const token = "disabled-secret";
  await withKeys(
    {
      keys: [
        {
          id: "old",
          tokenSha256: sha256Hex(token),
          teamId: "finance",
          appId: "bot",
          disabled: true,
        },
      ],
    },
    async () => {
      assert.equal(await matchClientKey(token), undefined);
      const status = await keyStatus();
      assert.equal(status.configured, false);
      assert.equal(status.enabledCount, 0);
      assert.equal(status.keys[0]?.disabled, true);
    },
  );
});
