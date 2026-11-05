import { randomUUID } from "node:crypto";
import { appendEvent, newEvent } from "./ledger.js";
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

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)]!;
}

/** Generate a realistic multi-day, multi-team demo ledger so dashboard tables are populated for recording. */
export async function seedDemoLedger(days = 14, eventsPerDay = 28): Promise<{ appended: number; days: number }> {
  let appended = 0;
  const now = new Date();
  for (let d = days - 1; d >= 0; d--) {
    const base = new Date(now);
    base.setUTCDate(base.getUTCDate() - d);
    base.setUTCHours(8, 0, 0, 0);
    for (let i = 0; i < eventsPerDay; i++) {
      const ts = new Date(base.getTime() + i * 25 * 60 * 1000); // spread through the day
      const isBlock = Math.random() < 0.18;
      const isEmbed = Math.random() < 0.22;
      const model = isEmbed ? "text-embedding-3-small" : pick(MODELS.filter((m) => m !== "text-embedding-3-small"));
      const teamId = pick(TEAMS);
      const appId = pick(APPS);
      const prompt = isEmbed ? rand(200, 1200) : rand(80, 1800);
      const completion = isEmbed ? 0 : isBlock ? 0 : rand(40, 600);
      const total = prompt + completion;
      const price = priceFor(model);
      const cost = isBlock ? 0 : (prompt / 1e6) * price.input + (completion / 1e6) * price.output;
      const latency = isBlock ? rand(5, 40) : rand(120, 2800);
      const policyIds: string[] = [];
      if (isEmbed) policyIds.push("endpoint:embeddings");
      if (isBlock) {
        policyIds.push(...pick(BLOCK_REASONS));
      } else {
        policyIds.push("allow");
        if (Math.random() < 0.3) policyIds.push("upstream:openai");
        else if (Math.random() < 0.15) policyIds.push("upstream:xai");
      }
      if (Math.random() < 0.25) policyIds.push(`key:demo-${teamId}`);

      const partial: Omit<UsageEvent, "id" | "timestamp"> = {
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
      };
      const event = newEvent({ ...partial, timestamp: ts.toISOString() });
      await appendEvent(event);
      appended++;
    }
  }
  // one operator note
  await appendEvent(
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
      policyIds: ["operator-note"],
      note: "Demo seed loaded for recording. All data is synthetic.",
      timestamp: new Date().toISOString(),
    }),
  );
  appended++;
  return { appended, days };
}
