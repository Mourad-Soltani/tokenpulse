import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile as readFileAsync } from "node:fs/promises";
import { join } from "node:path";
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

