import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

export const RateConfigSchema = z.object({
  defaultRpm: z.number().int().nonnegative().optional(),
  windowMs: z.number().int().positive().optional(),
  teams: z
    .record(
      z.object({
        rpm: z.number().int().nonnegative(),
      }),
    )
    .optional(),
});

export type RateConfig = z.infer<typeof RateConfigSchema>;

export type RateDecision = {
  allow: boolean;
  teamId: string;
  used: number;
  capRpm: number | null;
  retryAfterMs: number;
  policyId: string;
  reason?: string;
};

const hits = new Map<string, number[]>();

export function resetRateLimiter(): void {
  hits.clear();
}

export function ratesPath(): string {
  return process.env.TOKENPULSE_RATES_PATH ?? join(process.cwd(), "data", "rates.json");
}

export async function loadRates(): Promise<RateConfig> {
  const fromEnv = process.env.TOKENPULSE_DEFAULT_RPM;
  const envDefault = fromEnv !== undefined && fromEnv !== "" ? Number(fromEnv) : undefined;
  const envWindow = process.env.TOKENPULSE_RATE_WINDOW_MS;
  let fileCfg: RateConfig = {};
  try {
    const raw = await readFile(ratesPath(), "utf8");
    const parsed = RateConfigSchema.safeParse(JSON.parse(raw));
    if (parsed.success) fileCfg = parsed.data;
  } catch {
    // missing file = no file-level caps
  }
  return {
    defaultRpm: fileCfg.defaultRpm ?? (Number.isFinite(envDefault) ? envDefault : undefined),
    windowMs: fileCfg.windowMs ?? (envWindow && Number.isFinite(Number(envWindow)) ? Number(envWindow) : 60_000),
    teams: fileCfg.teams,
  };
}

export function capForTeam(cfg: RateConfig, teamId: string): number | null {
  const teamCap = cfg.teams?.[teamId]?.rpm;
  if (typeof teamCap === "number") return teamCap;
  if (typeof cfg.defaultRpm === "number") return cfg.defaultRpm;
  return null;
}

export async function evaluateRateLimit(teamId: string, now = Date.now()): Promise<RateDecision> {
  const cfg = await loadRates();
  const windowMs = cfg.windowMs ?? 60_000;
  const capRpm = capForTeam(cfg, teamId);
  const series = (hits.get(teamId) ?? []).filter((t) => now - t < windowMs);
  hits.set(teamId, series);
  if (capRpm === null) {
    series.push(now);
    hits.set(teamId, series);
    return { allow: true, teamId, used: series.length, capRpm: null, retryAfterMs: 0, policyId: "rate-unlimited" };
  }
  if (capRpm === 0 || series.length >= capRpm) {
    const oldest = series[0];
    const retryAfterMs = oldest !== undefined ? Math.max(1, windowMs - (now - oldest)) : windowMs;
    return {
      allow: false,
      teamId,
      used: series.length,
      capRpm,
      retryAfterMs,
      policyId: "rate-limited",
      reason: `team ${teamId} exceeded ${capRpm} requests per window`,
    };
  }
  series.push(now);
  hits.set(teamId, series);
  return { allow: true, teamId, used: series.length, capRpm, retryAfterMs: 0, policyId: "rate-ok" };
}
