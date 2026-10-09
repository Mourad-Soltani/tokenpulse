import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { keyStatus, keyUsageFromEvents, matchClientKey, sha256Hex } from "../src/keys.js";

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

test("issueClientKey writes digest only and matches once", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tp-issue-"));
  const path = join(dir, "keys.json");
  const prev = process.env.TOKENPULSE_KEYS_PATH;
  process.env.TOKENPULSE_KEYS_PATH = path;
  try {
    const { issueClientKey } = await import("../src/keys.js");
    const issued = await issueClientKey({ id: "finance-bot", teamId: "finance", appId: "bot", token: "issued-secret-value" });
    assert.equal(issued.token, "issued-secret-value");
    const raw = await (await import("node:fs/promises")).readFile(path, "utf8");
    assert.equal(raw.includes("issued-secret-value"), false);
    assert.equal(raw.includes(sha256Hex("issued-secret-value")), true);
    const hit = await matchClientKey("issued-secret-value");
    assert.deepEqual(hit, { id: "finance-bot", teamId: "finance", appId: "bot" });
    await assert.rejects(() => issueClientKey({ id: "finance-bot", teamId: "finance", appId: "bot" }), /already exists/);
  } finally {
    if (prev === undefined) delete process.env.TOKENPULSE_KEYS_PATH;
    else process.env.TOKENPULSE_KEYS_PATH = prev;
  }
});

test("revokeClientKey disables match and keeps digest", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tp-revoke-"));
  const path = join(dir, "keys.json");
  const prev = process.env.TOKENPULSE_KEYS_PATH;
  process.env.TOKENPULSE_KEYS_PATH = path;
  try {
    const { issueClientKey, revokeClientKey } = await import("../src/keys.js");
    const issued = await issueClientKey({ id: "finance-bot", teamId: "finance", appId: "bot", token: "issued-secret-value" });
    const digest = sha256Hex(issued.token);
    const revoked = await revokeClientKey("finance-bot");
    assert.equal(revoked.alreadyDisabled, false);
    assert.equal(await matchClientKey(issued.token), undefined);
    const raw = await (await import("node:fs/promises")).readFile(path, "utf8");
    assert.equal(raw.includes(issued.token), false);
    assert.equal(raw.includes(digest), true);
    assert.equal(raw.includes('"disabled": true'), true);
    const again = await revokeClientKey("finance-bot");
    assert.equal(again.alreadyDisabled, true);
    const status = await keyStatus();
    assert.equal(status.enabledCount, 0);
    assert.equal(status.keys[0]?.disabled, true);
    assert.equal(JSON.stringify(status).includes(digest), false);
    await assert.rejects(() => revokeClientKey("missing"), /not found/);
  } finally {
    if (prev === undefined) delete process.env.TOKENPULSE_KEYS_PATH;
    else process.env.TOKENPULSE_KEYS_PATH = prev;
  }
});

test("enableClientKey restores match and keeps digest", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tp-enable-"));
  const path = join(dir, "keys.json");
  const prev = process.env.TOKENPULSE_KEYS_PATH;
  process.env.TOKENPULSE_KEYS_PATH = path;
  try {
    const { issueClientKey, revokeClientKey, enableClientKey } = await import("../src/keys.js");
    const issued = await issueClientKey({ id: "finance-bot", teamId: "finance", appId: "bot", token: "issued-secret-value" });
    const digest = sha256Hex(issued.token);
    await revokeClientKey("finance-bot");
    assert.equal(await matchClientKey(issued.token), undefined);
    const enabled = await enableClientKey("finance-bot");
    assert.equal(enabled.alreadyEnabled, false);
    assert.deepEqual(await matchClientKey(issued.token), { id: "finance-bot", teamId: "finance", appId: "bot" });
    const raw = await (await import("node:fs/promises")).readFile(path, "utf8");
    assert.equal(raw.includes(issued.token), false);
    assert.equal(raw.includes(digest), true);
    assert.equal(raw.includes('"disabled": false'), true);
    const again = await enableClientKey("finance-bot");
    assert.equal(again.alreadyEnabled, true);
    const status = await keyStatus();
    assert.equal(status.enabledCount, 1);
    assert.equal(status.keys[0]?.disabled, false);
    assert.equal(JSON.stringify(status).includes(digest), false);
    await assert.rejects(() => enableClientKey("missing"), /not found/);
    await assert.rejects(() => enableClientKey(""), /invalid id/);
  } finally {
    if (prev === undefined) delete process.env.TOKENPULSE_KEYS_PATH;
    else process.env.TOKENPULSE_KEYS_PATH = prev;
  }
});

test("expired client key does not match and status omits digest", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tp-expire-"));
  const path = join(dir, "keys.json");
  const prev = process.env.TOKENPULSE_KEYS_PATH;
  process.env.TOKENPULSE_KEYS_PATH = path;
  try {
    const { issueClientKey, isKeyExpired, normalizeExpiresAt } = await import("../src/keys.js");
    assert.equal(normalizeExpiresAt("2020-01-02"), "2020-01-02T23:59:59.999Z");
    assert.equal(isKeyExpired("2020-01-02T23:59:59.999Z", Date.parse("2020-01-03T00:00:00.000Z")), true);
    const issued = await issueClientKey({
      id: "finance-bot",
      teamId: "finance",
      appId: "bot",
      token: "issued-secret-value",
      expiresAt: "2020-01-01",
    });
    assert.equal(issued.expiresAt, "2020-01-01T23:59:59.999Z");
    assert.equal(await matchClientKey(issued.token), undefined);
    const status = await keyStatus();
    assert.equal(status.enabledCount, 0);
    assert.equal(status.expiredCount, 1);
    assert.equal(status.configured, true);
    assert.equal(status.keys[0]?.expired, true);
    assert.equal(JSON.stringify(status).includes(sha256Hex(issued.token)), false);
    const live = await issueClientKey({
      id: "finance-live",
      teamId: "finance",
      appId: "bot",
      token: "issued-secret-live01",
      expiresAt: "2099-01-01",
    });
    assert.deepEqual(await matchClientKey(live.token), { id: "finance-live", teamId: "finance", appId: "bot" });
    await assert.rejects(
      () => issueClientKey({ id: "bad-exp", teamId: "finance", appId: "bot", token: "issued-secret-value2", expiresAt: "not-a-date" }),
      /invalid expires/,
    );
  } finally {
    if (prev === undefined) delete process.env.TOKENPULSE_KEYS_PATH;
    else process.env.TOKENPULSE_KEYS_PATH = prev;
  }
});

test("rotate client key replaces digest and drops the old bearer", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tp-rotate-"));
  const path = join(dir, "keys.json");
  const prev = process.env.TOKENPULSE_KEYS_PATH;
  process.env.TOKENPULSE_KEYS_PATH = path;
  try {
    const { issueClientKey, rotateClientKey, revokeClientKey } = await import("../src/keys.js");
    const issued = await issueClientKey({
      id: "finance-bot",
      teamId: "finance",
      appId: "bot",
      token: "issued-secret-value",
      expiresAt: "2099-06-01",
    });
    await revokeClientKey("finance-bot");
    const rotated = await rotateClientKey({ id: "finance-bot", token: "rotated-secret-value" });
    assert.equal(rotated.previousDisabled, true);
    assert.equal(rotated.teamId, "finance");
    assert.equal(rotated.appId, "bot");
    assert.equal(rotated.expiresAt, "2099-06-01T23:59:59.999Z");
    assert.equal(await matchClientKey(issued.token), undefined);
    assert.deepEqual(await matchClientKey(rotated.token), { id: "finance-bot", teamId: "finance", appId: "bot" });
    const raw = await (await import("node:fs/promises")).readFile(path, "utf8");
    assert.equal(raw.includes(sha256Hex(issued.token)), false);
    assert.equal(raw.includes(sha256Hex(rotated.token)), true);
    assert.equal(raw.includes(rotated.token), false);
    const status = await keyStatus();
    assert.equal(status.enabledCount, 1);
    assert.equal(status.keys[0]?.disabled, false);
    assert.equal(JSON.stringify(status).includes(sha256Hex(rotated.token)), false);
    await assert.rejects(() => rotateClientKey({ id: "missing", token: "rotated-secret-value2" }), /not found/);
    await assert.rejects(() => rotateClientKey({ id: "finance-bot", token: "short" }), /16–128/);
  } finally {
    if (prev === undefined) delete process.env.TOKENPULSE_KEYS_PATH;
    else process.env.TOKENPULSE_KEYS_PATH = prev;
  }
});

test("key status last-seen counts policy id only", async () => {
  await withKeys(
    {
      keys: [
        { id: "finance-bot", tokenSha256: sha256Hex("never-shown"), teamId: "finance", appId: "bot" },
      ],
    },
    async () => {
      const usage = keyUsageFromEvents(
        [
          { timestamp: "2026-10-08T01:00:00.000Z", policyIds: ["key:finance-bot", "model-open"] },
          { timestamp: "2026-10-08T02:00:00.000Z", policyIds: ["key:other"] },
          { timestamp: "2026-10-08T03:00:00.000Z", policyIds: ["key:finance-bot"] },
        ],
        "finance-bot",
      );
      assert.equal(usage.calls, 2);
      assert.equal(usage.lastSeenAt, "2026-10-08T03:00:00.000Z");
      const status = await keyStatus([
        { timestamp: "2026-10-08T03:00:00.000Z", policyIds: ["key:finance-bot"] },
      ]);
      assert.equal(status.keys[0]?.calls, 1);
      assert.equal(status.keys[0]?.lastSeenAt, "2026-10-08T03:00:00.000Z");
      assert.equal(JSON.stringify(status).includes("never-shown"), false);
      assert.equal(JSON.stringify(status).includes(sha256Hex("never-shown")), false);
    },
  );
});

test("key status idle warns unused matchable keys only", async () => {
  const prev = process.env.TOKENPULSE_KEY_IDLE_DAYS;
  process.env.TOKENPULSE_KEY_IDLE_DAYS = "30";
  try {
    await withKeys(
      {
        keys: [
          { id: "fresh", tokenSha256: sha256Hex("never-shown-fresh"), teamId: "finance", appId: "bot" },
          { id: "stale", tokenSha256: sha256Hex("never-shown-stale"), teamId: "finance", appId: "bot" },
          { id: "off", tokenSha256: sha256Hex("never-shown-off"), teamId: "finance", appId: "bot", disabled: true },
        ],
      },
      async () => {
        const now = Date.parse("2026-10-09T00:00:00.000Z");
        const status = await keyStatus([
          { timestamp: "2026-10-08T00:00:00.000Z", policyIds: ["key:fresh"] },
          { timestamp: "2026-08-01T00:00:00.000Z", policyIds: ["key:stale"] },
        ]);
        const fresh = status.keys.find((k) => k.id === "fresh");
        const stale = status.keys.find((k) => k.id === "stale");
        const off = status.keys.find((k) => k.id === "off");
        assert.equal(fresh?.idle, false);
        assert.equal(stale?.idle, true);
        assert.equal(off?.idle, false);
        assert.equal(status.idleDays, 30);
        assert.equal(status.idleWarnCount, 1);
        assert.equal(JSON.stringify(status).includes("never-shown"), false);
        const { keyIsIdle } = await import("../src/keys.js");
        assert.equal(keyIsIdle({ disabled: false, expired: false, calls: 0, lastSeenAt: null, idleDays: 30, nowMs: now }), true);
        assert.equal(keyIsIdle({ disabled: false, expired: false, calls: 0, lastSeenAt: null, idleDays: 0, nowMs: now }), false);
      },
    );
  } finally {
    if (prev === undefined) delete process.env.TOKENPULSE_KEY_IDLE_DAYS;
    else process.env.TOKENPULSE_KEY_IDLE_DAYS = prev;
  }
});
