import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

const CapSchema = z.object({
  maxPromptChars: z.number().int().nonnegative().optional(),
  maxTokens: z.number().int().nonnegative().optional(),
});

export const LimitsConfigSchema = z.object({
  defaultMaxPromptChars: z.number().int().nonnegative().optional(),
  defaultMaxTokens: z.number().int().nonnegative().optional(),
  teams: z.record(CapSchema).optional(),
  apps: z.record(CapSchema).optional(),
});

export type LimitsConfig = z.infer<typeof LimitsConfigSchema>;

export type LimitsDecision = {
  allow: boolean;
  policyId: string;
  scope: "team" | "app" | "none";
  reason?: string;
  promptChars: number;
  maxPromptChars: number | null;
  requestedMaxTokens: number | null;
  capMaxTokens: number | null;
};

export function limitsPath(): string {
  return process.env.TOKENPULSE_LIMITS_PATH ?? join(process.cwd(), "data", "limits.json");
}

function envInt(name: string): number | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

export async function loadLimits(): Promise<LimitsConfig> {
  let fileCfg: LimitsConfig = {};
  try {
    const raw = await readFile(limitsPath(), "utf8");
    const parsed = LimitsConfigSchema.safeParse(JSON.parse(raw));
    if (parsed.success) fileCfg = parsed.data;
  } catch {
    // missing file = env / unlimited
  }
  return {
    defaultMaxPromptChars: fileCfg.defaultMaxPromptChars ?? envInt("TOKENPULSE_MAX_PROMPT_CHARS"),
    defaultMaxTokens: fileCfg.defaultMaxTokens ?? envInt("TOKENPULSE_MAX_TOKENS"),
    teams: fileCfg.teams,
    apps: fileCfg.apps,
  };
}

export function capsForTeam(cfg: LimitsConfig, teamId: string): {
  maxPromptChars: number | null;
  maxTokens: number | null;
} {
  const team = cfg.teams?.[teamId];
  const maxPromptChars =
    typeof team?.maxPromptChars === "number"
      ? team.maxPromptChars
      : typeof cfg.defaultMaxPromptChars === "number"
        ? cfg.defaultMaxPromptChars
        : null;
  const maxTokens =
    typeof team?.maxTokens === "number"
      ? team.maxTokens
      : typeof cfg.defaultMaxTokens === "number"
        ? cfg.defaultMaxTokens
        : null;
  return { maxPromptChars, maxTokens };
}

export function capsForApp(cfg: LimitsConfig, appId: string): {
  maxPromptChars: number | null;
  maxTokens: number | null;
} {
  const app = cfg.apps?.[appId];
  return {
    maxPromptChars: typeof app?.maxPromptChars === "number" ? app.maxPromptChars : null,
    maxTokens: typeof app?.maxTokens === "number" ? app.maxTokens : null,
  };
}

function denyPrompt(opts: {
  policyId: string;
  scope: "team" | "app";
  reason: string;
  promptChars: number;
  maxPromptChars: number | null;
  requestedMaxTokens: number | null;
  capMaxTokens: number | null;
}): LimitsDecision {
  return { allow: false, ...opts };
}

function checkCaps(args: {
  scope: "team" | "app";
  policyPrompt: string;
  policyTokens: string;
  label: string;
  caps: { maxPromptChars: number | null; maxTokens: number | null };
  promptChars: number;
  requestedMaxTokens: number | null;
}): LimitsDecision | null {
  const { caps, promptChars, requestedMaxTokens } = args;
  if (caps.maxPromptChars !== null && promptChars > caps.maxPromptChars) {
    return denyPrompt({
      policyId: args.policyPrompt,
      scope: args.scope,
      reason: `prompt size ${promptChars} exceeds cap ${caps.maxPromptChars} for ${args.label}`,
      promptChars,
      maxPromptChars: caps.maxPromptChars,
      requestedMaxTokens,
      capMaxTokens: caps.maxTokens,
    });
  }
  if (caps.maxTokens !== null) {
    if (caps.maxTokens === 0) {
      return denyPrompt({
        policyId: args.policyTokens,
        scope: args.scope,
        reason: `max_tokens cap is 0 for ${args.label}`,
        promptChars,
        maxPromptChars: caps.maxPromptChars,
        requestedMaxTokens,
        capMaxTokens: 0,
      });
    }
    if (requestedMaxTokens !== null && requestedMaxTokens > caps.maxTokens) {
      return denyPrompt({
        policyId: args.policyTokens,
        scope: args.scope,
        reason: `requested max_tokens ${requestedMaxTokens} exceeds cap ${caps.maxTokens} for ${args.label}`,
        promptChars,
        maxPromptChars: caps.maxPromptChars,
        requestedMaxTokens,
        capMaxTokens: caps.maxTokens,
      });
    }
  }
  return null;
}

export async function evaluateLimits(opts: {
  teamId: string;
  appId?: string;
  promptChars: number;
  requestedMaxTokens?: number;
}): Promise<LimitsDecision> {
  const cfg = await loadLimits();
  const teamCaps = capsForTeam(cfg, opts.teamId);
  const appId = opts.appId ?? "default";
  const appCaps = capsForApp(cfg, appId);
  const requestedMaxTokens = opts.requestedMaxTokens ?? null;

  const teamDeny = checkCaps({
    scope: "team",
    policyPrompt: "limit-prompt-chars",
    policyTokens: "limit-max-tokens",
    label: `team ${opts.teamId}`,
    caps: teamCaps,
    promptChars: opts.promptChars,
    requestedMaxTokens,
  });
  if (teamDeny) return teamDeny;

  const appDeny = checkCaps({
    scope: "app",
    policyPrompt: "limit-prompt-chars-app",
    policyTokens: "limit-max-tokens-app",
    label: `app ${appId}`,
    caps: appCaps,
    promptChars: opts.promptChars,
    requestedMaxTokens,
  });
  if (appDeny) return appDeny;

  const anyCap =
    teamCaps.maxPromptChars !== null ||
    teamCaps.maxTokens !== null ||
    appCaps.maxPromptChars !== null ||
    appCaps.maxTokens !== null;
  const scope: LimitsDecision["scope"] =
    teamCaps.maxPromptChars !== null || teamCaps.maxTokens !== null
      ? "team"
      : appCaps.maxPromptChars !== null || appCaps.maxTokens !== null
        ? "app"
        : "none";
  return {
    allow: true,
    policyId: anyCap ? "limit-ok" : "limit-open",
    scope,
    promptChars: opts.promptChars,
    maxPromptChars: teamCaps.maxPromptChars ?? appCaps.maxPromptChars,
    requestedMaxTokens,
    capMaxTokens: teamCaps.maxTokens ?? appCaps.maxTokens,
  };
}

export function promptCharCount(texts: Array<{ content?: string } | string>): number {
  let n = 0;
  for (const t of texts) {
    const s = typeof t === "string" ? t : t.content ?? "";
    n += s.length;
  }
  return n;
}

export type LimitStatusRow = {
  scope: "team" | "app" | "default";
  id: string;
  kind: "prompt_chars" | "max_tokens";
  cap: number;
  warn: boolean;
  exhausted: boolean;
};

/**
 * Operator view of configured request-size caps.
 * Per-request policy — no running usage to peek. Warn when max_tokens cap is 0
 * (hard block).
 */
export async function limitStatus(): Promise<LimitStatusRow[]> {
  const cfg = await loadLimits();
  const rows: LimitStatusRow[] = [];

  const push = (
    scope: LimitStatusRow["scope"],
    id: string,
    kind: LimitStatusRow["kind"],
    cap: number | null,
  ) => {
    if (cap === null) return;
    const exhausted = kind === "max_tokens" && cap === 0;
    rows.push({
      scope,
      id,
      kind,
      cap,
      warn: exhausted,
      exhausted,
    });
  };

  push("default", "*", "prompt_chars", cfg.defaultMaxPromptChars ?? null);
  push("default", "*", "max_tokens", cfg.defaultMaxTokens ?? null);

  for (const teamId of Object.keys(cfg.teams ?? {}).sort()) {
    const explicit = cfg.teams?.[teamId];
    if (typeof explicit?.maxPromptChars === "number") {
      push("team", teamId, "prompt_chars", explicit.maxPromptChars);
    }
    if (typeof explicit?.maxTokens === "number") {
      push("team", teamId, "max_tokens", explicit.maxTokens);
    }
  }

  for (const appId of Object.keys(cfg.apps ?? {}).sort()) {
    const caps = capsForApp(cfg, appId);
    push("app", appId, "prompt_chars", caps.maxPromptChars);
    push("app", appId, "max_tokens", caps.maxTokens);
  }

  return rows;
}
