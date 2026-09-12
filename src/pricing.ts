/** Approximate list prices USD per 1M tokens. Operators can override later. */
const TABLE: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "o4-mini": { input: 1.1, output: 4.4 },
  "grok-3": { input: 3, output: 15 },
  "grok-2": { input: 2, output: 10 },
};

const FALLBACK = { input: 1, output: 3 };

export function priceFor(model: string): { input: number; output: number } {
  const key = model.toLowerCase();
  return TABLE[key] ?? TABLE[key.split("/").pop() ?? ""] ?? FALLBACK;
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
