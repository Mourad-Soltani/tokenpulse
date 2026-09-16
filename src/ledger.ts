import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { UsageEvent, UsageEventSchema } from "./types.js";
import { appendSqlite, ledgerDriver, readSqlite } from "./sqliteLedger.js";

export function ledgerRoot(): string {
  return process.env.TOKENPULSE_LEDGER_DIR ?? join(process.cwd(), "data", "ledger");
}

function dayKey(iso = new Date().toISOString()): string {
  return iso.slice(0, 10);
}

export function requestHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}

export function newEvent(partial: Omit<UsageEvent, "id" | "timestamp"> & { timestamp?: string }): UsageEvent {
  return UsageEventSchema.parse({
    id: `evt_${randomUUID()}`,
    timestamp: partial.timestamp ?? new Date().toISOString(),
    ...partial,
  });
}

async function appendJsonl(event: UsageEvent): Promise<string> {
  const dir = ledgerRoot();
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${dayKey(event.timestamp)}.jsonl`);
  await appendFile(file, `${JSON.stringify(event)}\n`, "utf8");
  return file;
}

export async function appendEvent(event: UsageEvent): Promise<string> {
  if (ledgerDriver() === "sqlite") return appendSqlite(event);
  return appendJsonl(event);
}

async function readJsonl(opts?: { day?: string }): Promise<UsageEvent[]> {
  const dir = ledgerRoot();
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".jsonl")).sort();
  } catch {
    return [];
  }
  if (opts?.day) files = files.filter((f) => f.startsWith(opts.day));
  const events: UsageEvent[] = [];
  for (const f of files) {
    const raw = await readFile(join(dir, f), "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      const parsed = UsageEventSchema.safeParse(JSON.parse(line));
      if (parsed.success) events.push(parsed.data);
    }
  }
  return events;
}

export async function readEvents(opts?: { day?: string }): Promise<UsageEvent[]> {
  if (ledgerDriver() === "sqlite") return readSqlite(opts);
  return readJsonl(opts);
}

export function summarize(events: UsageEvent[]) {
  const allowed = events.filter((e) => e.decision === "allow");
  const blocked = events.filter((e) => e.decision === "block");
  const byTeam: Record<string, { tokens: number; costUsd: number; calls: number }> = {};
  const byModel: Record<string, { tokens: number; costUsd: number; calls: number }> = {};
  let tokens = 0;
  let costUsd = 0;
  for (const e of events) {
    tokens += e.totalTokens;
    costUsd += e.estimatedCostUsd;
    const t = (byTeam[e.teamId] ??= { tokens: 0, costUsd: 0, calls: 0 });
    t.tokens += e.totalTokens;
    t.costUsd += e.estimatedCostUsd;
    t.calls += 1;
    const m = (byModel[e.model] ??= { tokens: 0, costUsd: 0, calls: 0 });
    m.tokens += e.totalTokens;
    m.costUsd += e.estimatedCostUsd;
    m.calls += 1;
  }
  return {
    calls: events.length,
    allowed: allowed.length,
    blocked: blocked.length,
    tokens,
    costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
    byTeam,
    byModel,
  };
}
