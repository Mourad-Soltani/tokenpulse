import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

/** Approximate list prices USD per 1M tokens. Operators can override via file. */
export const DEFAULT_PRICING_TABLE: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "o4-mini": { input: 1.1, output: 4.4 },
  "grok-3": { input: 3, output: 15 },
  "grok-2": { input: 2, output: 10 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
  "text-embedding-3-large": { input: 0.13, output: 0 },
  "text-embedding-ada-002": { input: 0.1, output: 0 },
};

const FALLBACK = { input: 1, output: 3 };

const PricingOverrideSchema = z.record(
  z.string().min(1),
  z.object({
    input: z.number().nonnegative(),
    output: z.number().nonnegative(),
  }),
);

let runtimeTable: Record<string, { input: number; output: number }> = { ...DEFAULT_PRICING_TABLE };
let overrideCount = 0;
let loaded = false;

export function pricingPath(): string {
  return process.env.TOKENPULSE_PRICING_PATH ?? join(process.cwd(), "data", "pricing.json");
}

/** Load optional operator overrides. Safe to call multiple times; last call wins. */
export async function loadPricingOverrides(): Promise<void> {
  runtimeTable = { ...DEFAULT_PRICING_TABLE };
  overrideCount = 0;
  try {
    const raw = await readFile(pricingPath(), "utf8");
    const parsed = PricingOverrideSchema.safeParse(JSON.parse(raw));
    if (parsed.success) {
      for (const [model, prices] of Object.entries(parsed.data)) {
        const key = model.toLowerCase();
        runtimeTable[key] = { ...prices };
        overrideCount += 1;
      }
    }
  } catch {
    // missing or invalid file = defaults only
  }
  loaded = true;
}

/** Ensure loaded at least once (no-op if already loaded). */
export async function ensurePricingLoaded(): Promise<void> {
  if (!loaded) await loadPricingOverrides();
}

export function priceFor(model: string): { input: number; output: number } {
  const key = model.toLowerCase();
  return runtimeTable[key] ?? runtimeTable[key.split("/").pop() ?? ""] ?? FALLBACK;
}

export function isKnownCatalogModel(model: string): boolean {
  const key = model.toLowerCase();
  if (runtimeTable[key]) return true;
  const short = key.split("/").pop() ?? "";
  return !!runtimeTable[short];
}

export function catalogModelIds(): string[] {
  return Object.keys(runtimeTable).sort();
}

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const p = priceFor(model);
  const usd = (promptTokens / 1_000_000) * p.input + (completionTokens / 1_000_000) * p.output;
  return Math.round(usd * 1_000_000) / 1_000_000;
}

export type PricingRow = {
  model: string;
  inputPerMillion: number;
  outputPerMillion: number;
  known: boolean;
  overridden?: boolean;
};

export type PricingStatus = {
  unit: "usd_per_million_tokens";
  catalogCount: number;
  overrideCount: number;
  fallback: { input: number; output: number };
  rows: PricingRow[];
};

/** Operator-visible catalog. Includes overrides when loaded. No secrets. */
export function pricingStatus(): PricingStatus {
  const defaultKeys = new Set(Object.keys(DEFAULT_PRICING_TABLE).map((k) => k.toLowerCase()));
  const rows: PricingRow[] = Object.entries(runtimeTable)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([model, p]) => ({
      model,
      inputPerMillion: p.input,
      outputPerMillion: p.output,
      known: true,
      overridden: !defaultKeys.has(model) || (DEFAULT_PRICING_TABLE[model] && (p.input !== DEFAULT_PRICING_TABLE[model].input || p.output !== DEFAULT_PRICING_TABLE[model].output)),
    }));
  return {
    unit: "usd_per_million_tokens",
    catalogCount: rows.length,
    overrideCount,
    fallback: { ...FALLBACK },
    rows,
  };
}
