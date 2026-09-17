import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

export const LimitsConfigSchema = z.object({
  defaultMaxPromptChars: z.number().int().nonnegative().optional(),
  defaultMaxTokens: z.number().int().nonnegative().optional(),
  teams: z
    .record(
      z.object({
        maxPromptChars: z.number().int().nonnegative().optional(),
        maxTokens: z.number().int().nonnegative().optional(),
      }),
    )
    .optional(),
});

export type LimitsConfig = z.infer<typeof LimitsConfigSchema>;

export type LimitsDecision = {
  allow: boolean;
  policyId: string;
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

export async function evaluateLimits(opts: {
  teamId: string;
  promptChars: number;
  requestedMaxTokens?: number;
}): Promise<LimitsDecision> {
  const cfg = await loadLimits();
  const caps = capsForTeam(cfg, opts.teamId);
  const requestedMaxTokens = opts.requestedMaxTokens ?? null;

  if (caps.maxPromptChars !== null && opts.promptChars > caps.maxPromptChars) {
    return {
      allow: false,
      policyId: "limit-prompt-chars",
      reason: `prompt size ${opts.promptChars} exceeds cap ${caps.maxPromptChars} for team ${opts.teamId}`,
      promptChars: opts.promptChars,
      maxPromptChars: caps.maxPromptChars,
      requestedMaxTokens,
      capMaxTokens: caps.maxTokens,
    };
  }

  if (caps.maxTokens !== null) {
    if (caps.maxTokens === 0) {
      return {
        allow: false,
        policyId: "limit-max-tokens",
        reason: `max_tokens cap is 0 for team ${opts.teamId}`,
        promptChars: opts.promptChars,
        maxPromptChars: caps.maxPromptChars,
        requestedMaxTokens,
        capMaxTokens: 0,
      };
    }
    if (requestedMaxTokens !== null && requestedMaxTokens > caps.maxTokens) {
      return {
        allow: false,
        policyId: "limit-max-tokens",
        reason: `requested max_tokens ${requestedMaxTokens} exceeds cap ${caps.maxTokens} for team ${opts.teamId}`,
        promptChars: opts.promptChars,
        maxPromptChars: caps.maxPromptChars,
        requestedMaxTokens,
        capMaxTokens: caps.maxTokens,
      };
    }
  }

  return {
    allow: true,
    policyId: caps.maxPromptChars === null && caps.maxTokens === null ? "limit-open" : "limit-ok",
    promptChars: opts.promptChars,
    maxPromptChars: caps.maxPromptChars,
    requestedMaxTokens,
    capMaxTokens: caps.maxTokens,
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
