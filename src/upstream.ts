import type { ChatCompletionRequest, EmbeddingRequest } from "./types.js";

export type UpstreamConfig = {
  baseUrl: string;
  apiKey: string;
  source: "tokenpulse" | "openai" | "xai" | "fallback";
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

/** Primary plus optional fallback. Dedupes identical baseUrl+key. */
export function resolveUpstreamChain(env: NodeJS.ProcessEnv = process.env): UpstreamConfig[] {
  const chain: UpstreamConfig[] = [];
  const primary = resolveUpstream(env);
  if (primary) chain.push(primary);
  const fbBase = env.TOKENPULSE_UPSTREAM_FALLBACK_BASE_URL?.trim();
  const fbKey = env.TOKENPULSE_UPSTREAM_FALLBACK_API_KEY?.trim();
  if (fbBase && fbKey) {
    const next: UpstreamConfig = { baseUrl: stripSlash(fbBase), apiKey: fbKey, source: "fallback" };
    const same = chain.some((c) => c.baseUrl === next.baseUrl && c.apiKey === next.apiKey);
    if (!same) chain.push(next);
  }
  return chain;
}

export type FallbackAttempt = { source: string; error?: string };

export async function withUpstreamFallback<T>(
  chain: UpstreamConfig[],
  run: (cfg: UpstreamConfig) => Promise<T>,
): Promise<{ result: T; used: UpstreamConfig; attempts: FallbackAttempt[] }> {
  if (chain.length === 0) {
    throw Object.assign(new Error("live upstream not configured"), { status: 501, type: "not_implemented" });
  }
  const attempts: FallbackAttempt[] = [];
  let lastErr: unknown;
  for (const cfg of chain) {
    try {
      const result = await run(cfg);
      attempts.push({ source: cfg.source });
      return { result, used: cfg, attempts };
    } catch (err) {
      const message = err instanceof Error ? err.message : "upstream_error";
      attempts.push({ source: cfg.source, error: message });
      lastErr = err;
    }
  }
  throw lastErr;
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

export type StreamResult = {
  usage: LiveCompletion["usage"];
};

/** Forward upstream SSE stream; parse usage from final chunk when present. */
export async function liveChatCompletionStream(
  req: ChatCompletionRequest,
  cfg: UpstreamConfig,
  onChunk: (chunk: string) => void,
  opts?: { timeoutMs?: number; fetchImpl?: typeof fetch },
): Promise<StreamResult> {
  const timeoutMs = opts?.timeoutMs ?? Number(process.env.TOKENPULSE_UPSTREAM_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const ac = new AbortController();
  const timer = setTimeout(
    () => ac.abort(),
    Number.isFinite(timeoutMs) ? Math.min(Math.max(timeoutMs, 500), 60_000) : DEFAULT_TIMEOUT_MS,
  );
  try {
    const res = await fetchImpl(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
        accept: "text/event-stream",
      },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages,
        max_tokens: req.max_tokens,
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal: ac.signal,
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      let msg = `upstream ${res.status}`;
      try {
        const parsed = text ? JSON.parse(text) : {};
        if (typeof parsed === "object" && parsed && "error" in parsed) {
          msg = String((parsed as { error?: { message?: string } }).error?.message ?? msg);
        }
      } catch {
        /* ignore */
      }
      throw Object.assign(new Error(msg), { status: res.status, type: "upstream_error" });
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let completionChars = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      buffer += text;
      onChunk(text);
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data) as {
            usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
            choices?: Array<{ delta?: { content?: string } }>;
          };
          if (parsed.usage) {
            usage = {
              promptTokens: Math.max(0, Number(parsed.usage.prompt_tokens ?? 0)),
              completionTokens: Math.max(0, Number(parsed.usage.completion_tokens ?? 0)),
              totalTokens: Math.max(
                0,
                Number(parsed.usage.total_tokens ?? 0) ||
                  Number(parsed.usage.prompt_tokens ?? 0) + Number(parsed.usage.completion_tokens ?? 0),
              ),
            };
          }
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === "string") completionChars += delta.length;
        } catch {
          /* ignore partial JSON */
        }
      }
    }
    if (usage.totalTokens === 0) {
      const promptChars = req.messages.reduce((n, m) => n + (m.content?.length ?? 0), 0);
      const promptTokens = Math.max(1, Math.ceil(promptChars / 4));
      const completionTokens = Math.max(1, Math.ceil(completionChars / 4));
      usage = {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      };
    }
    return { usage };
  } finally {
    clearTimeout(timer);
  }
}
