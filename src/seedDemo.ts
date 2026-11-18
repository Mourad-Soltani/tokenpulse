import { randomUUID } from "node:crypto";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { appendEvent, ledgerRoot, newEvent, readEvents } from "./ledger.js";
import { lastHash, sealEvent } from "./chain.js";
import { priceFor } from "./pricing.js";
import type { UsageEvent } from "./types.js";

const MODELS = ["gpt-4o-mini", "gpt-4o", "text-embedding-3-small", "claude-3-5-sonnet", "grok-2"];
const TEAMS = ["finance", "engineering", "support", "research", "default"];
const APPS = ["chatbot", "rag-pipeline", "code-assistant", "embeddings-batch", "internal-tool"];
const BLOCK_REASONS = [
  ["budget-daily-team"],
  ["budget-monthly-team"],
  ["rate-limited"],
  ["model_denied", "model-denied"],
  ["sensitive-block", "sensitive:secret"],
  ["limit-max-tokens"],
  ["rate-limited-app"],
];

export type SeedDemoOptions = {
  days?: number;
  perDay?: number;
  /** Higher volume + larger blocked-token *assumption* for impact estimates. Does not invent ledger prices. */
  mode?: "demo" | "enterprise";
  /** When true, erase existing ledger files before seeding. */
  force?: boolean;
};

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)]!;
}

export async function ledgerEventCount(): Promise<number> {
  const events = await readEvents();
  return events.length;
}

/** Remove all jsonl (and sqlite if present) under the ledger root. */
export async function wipeLedger(): Promise<void> {
  const dir = ledgerRoot();
  try {
    const files = await readdir(dir);
    await Promise.all(files.map((f) => rm(join(dir, f), { force: true })));
  } catch {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Synthetic multi-day demo ledger.
 * - Timestamps stay on a fixed grid and never exceed `now` (future slots skipped).
 * - Events sealed in chronological order in one pass (O(n) chain).
 * - `enterprise` raises volume caps and the *assumed* blocked-token figure used only by impact math via env for the process — callers should set TOKENPULSE_BLOCKED_ASSUME_TOKENS when seeding enterprise.
 */
export async function seedDemoLedger(
  daysOrOpts: number | SeedDemoOptions = 14,
  eventsPerDay = 28,
): Promise<{ appended: number; days: number; perDay: number; mode: string; wiped: boolean }> {
  const opts: SeedDemoOptions =
    typeof daysOrOpts === "number"
      ? { days: daysOrOpts, perDay: eventsPerDay, mode: "demo" }
      : daysOrOpts;

  const mode = opts.mode === "enterprise" ? "enterprise" : "demo";
  const days = Math.min(30, Math.max(1, Number(opts.days) || (mode === "enterprise" ? 30 : 14)));
  // Hard caps: enterprise max ~3.6k events (Railway-friendly). Not 150k — that needs a different storage path.
  const perDayCap = mode === "enterprise" ? 120 : 50;
  const perDay = Math.min(perDayCap, Math.max(1, Number(opts.perDay) || (mode === "enterprise" ? 100 : 28)));

  let wiped = false;
  const existing = await ledgerEventCount();
  if (existing > 0) {
    if (!opts.force) {
      const err = new Error(
        `Ledger already has ${existing} events. Pass force:true to wipe and re-seed, or wipe first.`,
      );
      (err as Error & { code?: string }).code = "LEDGER_POPULATED";
      throw err;
    }
    await wipeLedger();
    wiped = true;
  }

  const now = new Date();
  const nowMs = now.getTime();
  const blockRate = mode === "enterprise" ? 0.22 : 0.18;
  const draft: UsageEvent[] = [];

  for (let d = days - 1; d >= 0; d--) {
    const base = new Date(now);
    base.setUTCDate(base.getUTCDate() - d);
    base.setUTCHours(8, 0, 0, 0);
    for (let i = 0; i < perDay; i++) {
      const ts = new Date(base.getTime() + i * 25 * 60 * 1000);
      // Skip future slots — keeps a clean 25-minute grid with no sub-second "now" artifacts.
      if (ts.getTime() > nowMs) continue;

      const isBlock = Math.random() < blockRate;
      const isEmbed = Math.random() < 0.22;
      const model = isEmbed
        ? "text-embedding-3-small"
        : pick(MODELS.filter((m) => m !== "text-embedding-3-small"));
      const teamId = pick(TEAMS);
      const appId = pick(APPS);
      // Enterprise uses larger realistic allow sizes; blocks still store 0 real tokens (impact uses assumption).
      const prompt = isEmbed
        ? rand(200, mode === "enterprise" ? 2000 : 1200)
        : rand(80, mode === "enterprise" ? 4000 : 1800);
      const completion = isEmbed ? 0 : isBlock ? 0 : rand(40, mode === "enterprise" ? 1200 : 600);
      const total = prompt + completion;
      const price = priceFor(model);
      const cost = isBlock ? 0 : (prompt / 1e6) * price.input + (completion / 1e6) * price.output;
      const latency = isBlock ? rand(5, 40) : rand(120, 2800);
      const policyIds: string[] = [];
      if (isEmbed) policyIds.push("endpoint:embeddings");
      if (isBlock) policyIds.push(...pick(BLOCK_REASONS));
      else {
        policyIds.push("allow");
        if (Math.random() < 0.3) policyIds.push("upstream:openai");
        else if (Math.random() < 0.15) policyIds.push("upstream:xai");
      }
      if (Math.random() < 0.25) policyIds.push(`key:demo-${teamId}`);

      draft.push(
        newEvent({
          teamId,
          appId,
          model,
          promptTokens: isBlock ? 0 : prompt,
          completionTokens: isBlock ? 0 : completion,
          totalTokens: isBlock ? 0 : total,
          estimatedCostUsd: Math.round(cost * 1e6) / 1e6,
          latencyMs: latency,
          decision: isBlock ? "block" : "allow",
          policyIds,
          requestId: `tp_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
          timestamp: ts.toISOString(),
        }),
      );
    }
  }

  draft.push(
    newEvent({
      teamId: "ops",
      appId: "admin",
      model: "",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      latencyMs: 0,
      decision: "note",
      policyIds: ["operator-note", "demo-seed", mode === "enterprise" ? "demo-enterprise" : "demo-standard"],
      note:
        mode === "enterprise"
          ? "DEMO DATA — SIMULATED enterprise-scale traffic (synthetic). No production customer data. No raw prompts. Impact estimates use TOKENPULSE_BLOCKED_ASSUME_TOKENS when set."
          : "DEMO DATA — SIMULATED multi-day enterprise traffic. Synthetic only. No production customer data. No raw prompts.",
      timestamp: new Date(Math.min(nowMs, Date.now())).toISOString().replace(/\.\d{3}Z$/, ".000Z"),
    }),
  );

  draft.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Single-pass chain seal then write by day file (fast path; avoids O(n²) read-on-each-append).
  // Genesis must use empty-string prevHash (not undefined) so JSON.stringify matches verifyChain.
  let prev = "";
  const byDay = new Map<string, UsageEvent[]>();
  for (const ev of draft) {
    const sealed = sealEvent(ev, prev);
    prev = sealed.hash!;
    const day = sealed.timestamp.slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(sealed);
    byDay.set(day, list);
  }

  const dir = ledgerRoot();
  await mkdir(dir, { recursive: true });
  for (const [day, list] of [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const body = list.map((e) => JSON.stringify(e)).join("\n") + "\n";
    await writeFile(join(dir, `${day}.jsonl`), body, "utf8");
  }

  return { appended: draft.length, days, perDay, mode, wiped };
}
