import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { type UsageEvent, UsageEventSchema } from "./types.js";

function sqlitePath(): string {
  return process.env.TOKENPULSE_SQLITE_PATH ?? join(process.cwd(), "data", "ledger.sqlite");
}

let db: DatabaseSync | undefined;

function open(): DatabaseSync {
  if (db) return db;
  const path = sqlitePath();
  mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_events (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      team_id TEXT NOT NULL,
      app_id TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL,
      completion_tokens INTEGER NOT NULL,
      total_tokens INTEGER NOT NULL,
      estimated_cost_usd REAL NOT NULL,
      latency_ms REAL NOT NULL,
      decision TEXT NOT NULL,
      policy_ids TEXT NOT NULL,
      request_hash TEXT,
      prev_hash TEXT,
      hash TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_usage_ts ON usage_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_usage_day_team ON usage_events(timestamp, team_id);
  `);
  try {
    db.exec(`ALTER TABLE usage_events ADD COLUMN prev_hash TEXT`);
  } catch {
    /* already present */
  }
  try {
    db.exec(`ALTER TABLE usage_events ADD COLUMN hash TEXT`);
  } catch {
    /* already present */
  }
  return db;
}

/** Test helper — drop the cached connection. */
export function resetSqliteConnection(): void {
  if (db) {
    try {
      db.close();
    } catch {
      /* ignore */
    }
    db = undefined;
  }
}

export async function appendSqlite(event: UsageEvent): Promise<string> {
  const conn = open();
  conn
    .prepare(
      `INSERT INTO usage_events (
        id, timestamp, team_id, app_id, model,
        prompt_tokens, completion_tokens, total_tokens,
        estimated_cost_usd, latency_ms, decision, policy_ids, request_hash, prev_hash, hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      event.id,
      event.timestamp,
      event.teamId,
      event.appId,
      event.model,
      event.promptTokens,
      event.completionTokens,
      event.totalTokens,
      event.estimatedCostUsd,
      event.latencyMs,
      event.decision,
      JSON.stringify(event.policyIds),
      event.requestHash ?? null,
      event.prevHash ?? null,
      event.hash ?? null,
    );
  return sqlitePath();
}

export async function readSqlite(opts?: { day?: string; month?: string }): Promise<UsageEvent[]> {
  const conn = open();
  const rows = opts?.day
    ? conn
        .prepare(`SELECT * FROM usage_events WHERE substr(timestamp, 1, 10) = ? ORDER BY timestamp, id`)
        .all(opts.day)
    : opts?.month
      ? conn
          .prepare(`SELECT * FROM usage_events WHERE substr(timestamp, 1, 7) = ? ORDER BY timestamp, id`)
          .all(opts.month)
      : conn.prepare(`SELECT * FROM usage_events ORDER BY timestamp, id`).all();

  const events: UsageEvent[] = [];
  for (const row of rows) {
    const parsed = UsageEventSchema.safeParse({
      id: row.id,
      timestamp: row.timestamp,
      teamId: row.team_id,
      appId: row.app_id,
      model: row.model,
      promptTokens: Number(row.prompt_tokens),
      completionTokens: Number(row.completion_tokens),
      totalTokens: Number(row.total_tokens),
      estimatedCostUsd: Number(row.estimated_cost_usd),
      latencyMs: Number(row.latency_ms),
      decision: row.decision,
      policyIds: JSON.parse(String(row.policy_ids || "[]")),
      requestHash: row.request_hash ?? undefined,
      prevHash: row.prev_hash ?? undefined,
      hash: row.hash ?? undefined,
    });
    if (parsed.success) events.push(parsed.data);
  }
  return events;
}

export function ledgerDriver(): "jsonl" | "sqlite" {
  const raw = (process.env.TOKENPULSE_LEDGER_DRIVER ?? "jsonl").toLowerCase().trim();
  return raw === "sqlite" ? "sqlite" : "jsonl";
}
