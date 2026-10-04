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
};

export type KeyStatus = {
  version: "tokenpulse-keys-v1";
  configured: boolean;
  enabledCount: number;
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

export function keysConfiguredSync(): boolean {
  try {
    const raw = readFileSync(keysPath(), "utf8");
    return parseKeys(raw).some((k) => !k.disabled);
  } catch {
    return false;
  }
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
  path: string;
};

/** Append a digest-only key. Plaintext is returned once and never written. */
export async function issueClientKey(input: {
  id: string;
  teamId: string;
  appId: string;
  token?: string;
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
  const next = [...existing, { id, tokenSha256: sha256Hex(token), teamId, appId }];
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify({ keys: next }, null, 2) + "\n", { mode: 0o600 });
  return { id, teamId, appId, token, path };
}

/** Operator-visible key map. Digests and bearer tokens are never serialized. */
export async function keyStatus(): Promise<KeyStatus> {
  const keys = await loadKeys();
  const rows = keys.map((k) => ({
    id: k.id,
    teamId: k.teamId,
    appId: k.appId,
    disabled: Boolean(k.disabled),
  }));
  return {
    version: "tokenpulse-keys-v1",
    configured: rows.some((k) => !k.disabled),
    enabledCount: rows.filter((k) => !k.disabled).length,
    keys: rows,
    storesTokenMaterial: false,
    notes: "Enabled keys bind teamId and appId. Client headers cannot override a key match. Gateway token remains the operator path.",
  };
}

