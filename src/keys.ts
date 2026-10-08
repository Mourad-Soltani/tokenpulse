import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readFile as readFileAsync, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";

export const ClientKeySchema = z.object({
  id: z.string().min(1).max(64),
  tokenSha256: z.string().regex(/^[a-f0-9]{64}$/),
  teamId: z.string().min(1).max(64),
  appId: z.string().min(1).max(64),
  disabled: z.boolean().optional(),
  /** Inclusive UTC expiry. Date-only values are stored as end of that UTC day. */
  expiresAt: z.string().min(10).max(40).optional(),
});

export const KeysFileSchema = z.object({
  keys: z.array(ClientKeySchema).default([]),
});

export type ClientKey = z.infer<typeof ClientKeySchema>;

export type KeyMatch = {
  id: string;
  teamId: string;
  appId: string;
};

export type KeyStatusRow = {
  id: string;
  teamId: string;
  appId: string;
  disabled: boolean;
  expiresAt: string | null;
  expired: boolean;
};

export type KeyStatus = {
  version: "tokenpulse-keys-v1";
  configured: boolean;
  enabledCount: number;
  expiredCount: number;
  keys: KeyStatusRow[];
  storesTokenMaterial: false;
  notes: string;
};

export function keysPath(): string {
  return process.env.TOKENPULSE_KEYS_PATH ?? join(process.cwd(), "data", "keys.json");
}

export function sha256Hex(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function parseKeys(raw: string): ClientKey[] {
  const parsed = KeysFileSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return [];
  return parsed.data.keys;
}

export async function loadKeys(): Promise<ClientKey[]> {
  try {
    const raw = await readFileAsync(keysPath(), "utf8");
    return parseKeys(raw);
  } catch {
    return [];
  }
}

/** True when a non-disabled key row exists. Expired rows still lock the gateway. */
export function keysConfiguredSync(): boolean {
  try {
    const raw = readFileSync(keysPath(), "utf8");
    return parseKeys(raw).some((k) => !k.disabled);
  } catch {
    return false;
  }
}

/** Date-only `YYYY-MM-DD` is inclusive through 23:59:59.999Z that UTC day. */
export function normalizeExpiresAt(raw: string | undefined): string | undefined {
  if (raw === undefined || raw.trim() === "") return undefined;
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const end = Date.parse(`${value}T23:59:59.999Z`);
    if (Number.isNaN(end)) throw new Error("invalid expires");
    return `${value}T23:59:59.999Z`;
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new Error("invalid expires");
  return new Date(ms).toISOString();
}

export function isKeyExpired(expiresAt: string | undefined, now = Date.now()): boolean {
  if (!expiresAt) return false;
  const ms = Date.parse(expiresAt);
  if (Number.isNaN(ms)) return true;
  return ms <= now;
}

function digestEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length || ab.length === 0) return false;
  return timingSafeEqual(ab, bb);
}

/** Match a presented bearer against stored SHA-256 digests. Never returns the digest. */
export async function matchClientKey(token: string): Promise<KeyMatch | undefined> {
  if (!token) return undefined;
  const digest = sha256Hex(token);
  const keys = await loadKeys();
  for (const key of keys) {
    if (key.disabled) continue;
    if (isKeyExpired(key.expiresAt)) continue;
    if (digestEqual(digest, key.tokenSha256)) {
      return { id: key.id, teamId: key.teamId, appId: key.appId };
    }
  }
  return undefined;
}


const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

export type IssuedKey = {
  id: string;
  teamId: string;
  appId: string;
  token: string;
  expiresAt: string | null;
  path: string;
};

/** Append a digest-only key. Plaintext is returned once and never written. */
export async function issueClientKey(input: {
  id: string;
  teamId: string;
  appId: string;
  token?: string;
  expiresAt?: string;
}): Promise<IssuedKey> {
  const id = input.id.trim();
  const teamId = input.teamId.trim();
  const appId = input.appId.trim();
  if (!ID_RE.test(id) || !ID_RE.test(teamId) || !ID_RE.test(appId)) {
    throw new Error("invalid id, team, or app (1–64 chars of [A-Za-z0-9._:-])");
  }
  const path = keysPath();
  let existing: ClientKey[] = [];
  try {
    const raw = await readFileAsync(path, "utf8");
    const parsed = KeysFileSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) throw new Error("keys file is invalid; refusing to overwrite");
    existing = parsed.data.keys;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }
  if (existing.some((k) => k.id === id)) throw new Error("key id already exists");
  const token = input.token ?? randomBytes(24).toString("base64url");
  if (token.length < 16 || token.length > 128) throw new Error("token must be 16–128 chars");
  const expiresAt = normalizeExpiresAt(input.expiresAt);
  const next = [...existing, { id, tokenSha256: sha256Hex(token), teamId, appId, ...(expiresAt ? { expiresAt } : {}) }];
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify({ keys: next }, null, 2) + "\n", { mode: 0o600 });
  return { id, teamId, appId, token, expiresAt: expiresAt ?? null, path };
}


export type RevokedKey = {
  id: string;
  teamId: string;
  appId: string;
  alreadyDisabled: boolean;
  path: string;
};

async function readKeysFile(): Promise<{ path: string; keys: ClientKey[] }> {
  const path = keysPath();
  let raw: string;
  try {
    raw = await readFileAsync(path, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new Error("keys file does not exist");
    throw err;
  }
  const parsed = KeysFileSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error("keys file is invalid; refusing to overwrite");
  return { path, keys: parsed.data.keys };
}

/** Disable a key by id. Digest stays on disk so the row remains auditable. */
export async function revokeClientKey(id: string): Promise<RevokedKey> {
  const keyId = id.trim();
  if (!ID_RE.test(keyId)) throw new Error("invalid id (1–64 chars of [A-Za-z0-9._:-])");
  const { path, keys } = await readKeysFile();
  const idx = keys.findIndex((k) => k.id === keyId);
  if (idx < 0) throw new Error("key id not found");
  const current = keys[idx]!;
  const alreadyDisabled = Boolean(current.disabled);
  if (!alreadyDisabled) {
    const next = keys.map((k, i) => (i === idx ? { ...k, disabled: true } : k));
    await writeFile(path, JSON.stringify({ keys: next }, null, 2) + "\n", { mode: 0o600 });
  }
  return {
    id: current.id,
    teamId: current.teamId,
    appId: current.appId,
    alreadyDisabled,
    path,
  };
}

export type EnabledKey = {
  id: string;
  teamId: string;
  appId: string;
  alreadyEnabled: boolean;
  path: string;
};

export type RotatedKey = {
  id: string;
  teamId: string;
  appId: string;
  token: string;
  expiresAt: string | null;
  previousDisabled: boolean;
  path: string;
};

/**
 * Replace the SHA-256 digest for an existing id. Team, app, and expiry stay.
 * Disabled is cleared so the new bearer can match. Old bearer no longer matches.
 * Plaintext is returned once and never written.
 */
export async function rotateClientKey(input: { id: string; token?: string }): Promise<RotatedKey> {
  const keyId = input.id.trim();
  if (!ID_RE.test(keyId)) throw new Error("invalid id (1–64 chars of [A-Za-z0-9._:-])");
  const { path, keys } = await readKeysFile();
  const idx = keys.findIndex((k) => k.id === keyId);
  if (idx < 0) throw new Error("key id not found");
  const current = keys[idx]!;
  const token = input.token ?? randomBytes(24).toString("base64url");
  if (token.length < 16 || token.length > 128) throw new Error("token must be 16–128 chars");
  const next = keys.map((k, i) =>
    i === idx ? { ...k, tokenSha256: sha256Hex(token), disabled: false } : k,
  );
  await writeFile(path, JSON.stringify({ keys: next }, null, 2) + "\n", { mode: 0o600 });
  return {
    id: current.id,
    teamId: current.teamId,
    appId: current.appId,
    token,
    expiresAt: current.expiresAt ?? null,
    previousDisabled: Boolean(current.disabled),
    path,
  };
}

/** Re-enable a disabled key by id. Digest is unchanged; no new bearer is minted. */
export async function enableClientKey(id: string): Promise<EnabledKey> {
  const keyId = id.trim();
  if (!ID_RE.test(keyId)) throw new Error("invalid id (1–64 chars of [A-Za-z0-9._:-])");
  const { path, keys } = await readKeysFile();
  const idx = keys.findIndex((k) => k.id === keyId);
  if (idx < 0) throw new Error("key id not found");
  const current = keys[idx]!;
  const alreadyEnabled = !current.disabled;
  if (!alreadyEnabled) {
    const next = keys.map((k, i) => (i === idx ? { ...k, disabled: false } : k));
    await writeFile(path, JSON.stringify({ keys: next }, null, 2) + "\n", { mode: 0o600 });
  }
  return {
    id: current.id,
    teamId: current.teamId,
    appId: current.appId,
    alreadyEnabled,
    path,
  };
}

/** Operator-visible key map. Digests and bearer tokens are never serialized. */
export async function keyStatus(): Promise<KeyStatus> {
  const keys = await loadKeys();
  const rows = keys.map((k) => ({
    id: k.id,
    teamId: k.teamId,
    appId: k.appId,
    disabled: Boolean(k.disabled),
    expiresAt: k.expiresAt ?? null,
    expired: isKeyExpired(k.expiresAt),
  }));
  return {
    version: "tokenpulse-keys-v1",
    configured: rows.some((k) => !k.disabled),
    enabledCount: rows.filter((k) => !k.disabled && !k.expired).length,
    expiredCount: rows.filter((k) => k.expired && !k.disabled).length,
    keys: rows,
    storesTokenMaterial: false,
    notes: "Enabled keys bind teamId and appId. Expired keys do not match but still require auth until disabled. Rotate replaces the digest and clears disabled. Digests are never shown. Gateway token remains the operator path.",
  };
}

