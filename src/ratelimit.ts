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
  apps: z
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
  appId: string;
  used: number;
  capRpm: number | null;
  retryAfterMs: number;
  policyId: string;
  scope: "team" | "app" | "none";
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
    apps: fileCfg.apps,
  };
}

export function capForTeam(cfg: RateConfig, teamId: string): number | null {
  const teamCap = cfg.teams?.[teamId]?.rpm;
  if (typeof teamCap === "number") return teamCap;
  if (typeof cfg.defaultRpm === "number") return cfg.defaultRpm;
  return null;
}

export function capForApp(cfg: RateConfig, appId: string): number | null {
  const appCap = cfg.apps?.[appId]?.rpm;
  if (typeof appCap === "number") return appCap;
  return null;
}

function consume(key: string, capRpm: number | null, now: number, windowMs: number): {
  allow: boolean;
  used: number;
  retryAfterMs: number;
} {
  const series = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.set(key, series);
  if (capRpm === null) {
    series.push(now);
    hits.set(key, series);
    return { allow: true, used: series.length, retryAfterMs: 0 };
  }
  if (capRpm === 0 || series.length >= capRpm) {
    const oldest = series[0];
    const retryAfterMs = oldest !== undefined ? Math.max(1, windowMs - (now - oldest)) : windowMs;
    return { allow: false, used: series.length, retryAfterMs };
  }
  series.push(now);
  hits.set(key, series);
  return { allow: true, used: series.length, retryAfterMs: 0 };
}

export async function evaluateRateLimit(
  teamId: string,
  appId = "default",
  now = Date.now(),
): Promise<RateDecision> {
  const cfg = await loadRates();
  const windowMs = cfg.windowMs ?? 60_000;
  const teamCap = capForTeam(cfg, teamId);
  const teamHit = consume(`team:${teamId}`, teamCap, now, windowMs);
  if (teamCap !== null && !teamHit.allow) {
    return {
      allow: false,
      teamId,
      appId,
      used: teamHit.used,
      capRpm: teamCap,
      retryAfterMs: teamHit.retryAfterMs,
      policyId: "rate-limited",
      scope: "team",
      reason: `team ${teamId} exceeded ${teamCap} requests per window`,
    };
  }

  const appCap = capForApp(cfg, appId);
  const appHit = consume(`app:${appId}`, appCap, now, windowMs);
  if (appCap !== null && !appHit.allow) {
    return {
      allow: false,
      teamId,
      appId,
      used: appHit.used,
      capRpm: appCap,
      retryAfterMs: appHit.retryAfterMs,
      policyId: "rate-limited-app",
      scope: "app",
      reason: `app ${appId} exceeded ${appCap} requests per window`,
    };
  }

  const unlimited = teamCap === null && appCap === null;
  return {
    allow: true,
    teamId,
    appId,
    used: teamHit.used,
    capRpm: teamCap ?? appCap,
    retryAfterMs: 0,
    policyId: unlimited ? "rate-unlimited" : "rate-ok",
    scope: teamCap !== null ? "team" : appCap !== null ? "app" : "none",
  };
}
