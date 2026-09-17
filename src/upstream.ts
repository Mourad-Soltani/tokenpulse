import type { ChatCompletionRequest, EmbeddingRequest } from "./types.js";

export type UpstreamConfig = {
  baseUrl: string;
  apiKey: string;
  source: "tokenpulse" | "openai" | "xai";
};

export type LiveCompletion = {
  body: Record<string, unknown>;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
};

const DEFAULT_TIMEOUT_MS = 20_000;

export function resolveUpstream(env: NodeJS.ProcessEnv = process.env): UpstreamConfig | null {
  const explicitBase = env.TOKENPULSE_UPSTREAM_BASE_URL?.trim();
  const explicitKey = env.TOKENPULSE_UPSTREAM_API_KEY?.trim();
  if (explicitBase && explicitKey) {
    return { baseUrl: stripSlash(explicitBase), apiKey: explicitKey, source: "tokenpulse" };
  }
  if (env.XAI_API_KEY?.trim()) {
    return {
      baseUrl: stripSlash(explicitBase || "https://api.x.ai/v1"),
      apiKey: env.XAI_API_KEY.trim(),
      source: "xai",
    };
  }
  if (env.OPENAI_API_KEY?.trim()) {
    return {
      baseUrl: stripSlash(explicitBase || "https://api.openai.com/v1"),
      apiKey: env.OPENAI_API_KEY.trim(),
      source: "openai",
    };
  }
  return null;
}

function stripSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function isMockUpstream(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = (env.TOKENPULSE_MOCK_UPSTREAM ?? "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export async function liveChatCompletion(
  req: ChatCompletionRequest,
  cfg: UpstreamConfig,
  opts?: { timeoutMs?: number; fetchImpl?: typeof fetch },
): Promise<LiveCompletion> {
  const timeoutMs = opts?.timeoutMs ?? Number(process.env.TOKENPULSE_UPSTREAM_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), Number.isFinite(timeoutMs) ? Math.min(Math.max(timeoutMs, 500), 60_000) : DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages,
        max_tokens: req.max_tokens,
        stream: false,
      }),
      signal: ac.signal,
    });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      throw Object.assign(new Error("upstream returned non-json"), { status: res.status, type: "upstream_error" });
    }
    if (!res.ok) {
      const msg =
        typeof parsed === "object" && parsed && "error" in parsed
          ? String((parsed as { error?: { message?: string } }).error?.message ?? `upstream ${res.status}`)
          : `upstream ${res.status}`;
      throw Object.assign(new Error(msg), { status: res.status, type: "upstream_error", body: parsed });
    }
    const usage = extractUsage(parsed);
    return { body: parsed as Record<string, unknown>, usage };
  } finally {
    clearTimeout(timer);
  }
}


export async function liveEmbeddings(
  req: EmbeddingRequest,
  cfg: UpstreamConfig,
  opts?: { timeoutMs?: number; fetchImpl?: typeof fetch },
): Promise<LiveCompletion> {
  const timeoutMs = opts?.timeoutMs ?? Number(process.env.TOKENPULSE_UPSTREAM_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), Number.isFinite(timeoutMs) ? Math.min(Math.max(timeoutMs, 500), 60_000) : DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${cfg.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: req.model,
        input: req.input,
        encoding_format: req.encoding_format,
        dimensions: req.dimensions,
      }),
      signal: ac.signal,
    });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      throw Object.assign(new Error("upstream returned non-json"), { status: res.status, type: "upstream_error" });
    }
    if (!res.ok) {
      const msg =
        typeof parsed === "object" && parsed && "error" in parsed
          ? String((parsed as { error?: { message?: string } }).error?.message ?? `upstream ${res.status}`)
          : `upstream ${res.status}`;
      throw Object.assign(new Error(msg), { status: res.status, type: "upstream_error", body: parsed });
    }
    const usage = extractUsage(parsed);
    return { body: parsed as Record<string, unknown>, usage };
  } finally {
    clearTimeout(timer);
  }
}

function extractUsage(body: unknown): LiveCompletion["usage"] {
  const u =
    typeof body === "object" && body && "usage" in body
      ? (body as { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }).usage
      : undefined;
  const promptTokens = Math.max(0, Number(u?.prompt_tokens ?? 0));
  const completionTokens = Math.max(0, Number(u?.completion_tokens ?? 0));
  const totalTokens = Math.max(promptTokens + completionTokens, Number(u?.total_tokens ?? 0));
  return { promptTokens, completionTokens, totalTokens };
}
