import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { ChatCompletionRequestSchema } from "./types.js";
import { appendEvent, newEvent, requestHash } from "./ledger.js";
import { estimateCostUsd } from "./pricing.js";
import { mockChatCompletion } from "./mockUpstream.js";
import { evaluateBudget } from "./budget.js";
import { isMockUpstream, liveChatCompletion, resolveUpstream } from "./upstream.js";

const DEFAULT_PORT = 8788;

function header(req: IncomingMessage, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function json(res: ServerResponse, status: number, body: unknown) {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(raw),
  });
  res.end(raw);
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function authOk(req: IncomingMessage): boolean {
  const expected = process.env.TOKENPULSE_GATEWAY_TOKEN;
  if (!expected) return true;
  const raw = header(req, "authorization") ?? header(req, "x-tokenpulse-token") ?? "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
  return safeEqual(token, expected);
}

export async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (req.method === "GET" && url.pathname === "/health") {
    json(res, 200, {
      ok: true,
      service: "tokenpulse",
      mock: isMockUpstream(),
      liveConfigured: Boolean(resolveUpstream()),
      authRequired: Boolean(process.env.TOKENPULSE_GATEWAY_TOKEN),
    });
    return;
  }

  if (!authOk(req)) {
    json(res, 401, { error: { message: "unauthorized", type: "auth_error" } });
    return;
  }

  if (req.method === "POST" && (url.pathname === "/v1/chat/completions" || url.pathname === "/chat/completions")) {
    const started = Date.now();
    const raw = await readBody(req);
    let parsedJson: unknown;
    try {
      parsedJson = raw ? JSON.parse(raw) : {};
    } catch {
      json(res, 400, { error: { message: "invalid json", type: "invalid_request_error" } });
      return;
    }
    const parsed = ChatCompletionRequestSchema.safeParse(parsedJson);
    if (!parsed.success) {
      json(res, 400, { error: { message: parsed.error.message, type: "invalid_request_error" } });
      return;
    }
    if (parsed.data.stream) {
      json(res, 400, { error: { message: "streaming not supported in v0.1", type: "invalid_request_error" } });
      return;
    }

    const teamId = header(req, "x-tokenpulse-team") || "default";
    const appId = header(req, "x-tokenpulse-app") || "default";
    const mock = isMockUpstream();

    const budget = await evaluateBudget(teamId);
    if (!budget.allow) {
      const event = newEvent({
        teamId,
        appId,
        model: parsed.data.model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        latencyMs: Date.now() - started,
        decision: "block",
        policyIds: [budget.policyId],
        requestHash: requestHash({ model: parsed.data.model, n: parsed.data.messages.length }),
      });
      await appendEvent(event);
      json(res, 429, {
        error: {
          message: budget.reason ?? "daily budget exceeded",
          type: "budget_exceeded",
          team: teamId,
          spentUsd: budget.spentUsd,
          capUsd: budget.capUsd,
        },
      });
      return;
    }

    if (mock) {
      const mockRes = mockChatCompletion(parsed.data);
      const latencyMs = Date.now() - started;
      const event = newEvent({
        teamId,
        appId,
        model: parsed.data.model,
        promptTokens: mockRes.usage.promptTokens,
        completionTokens: mockRes.usage.completionTokens,
        totalTokens: mockRes.usage.totalTokens,
        estimatedCostUsd: estimateCostUsd(
          parsed.data.model,
          mockRes.usage.promptTokens,
          mockRes.usage.completionTokens,
        ),
        latencyMs,
        decision: "allow",
        policyIds: [budget.policyId, "mock-allow"],
        requestHash: requestHash({ model: parsed.data.model, n: parsed.data.messages.length }),
      });
      await appendEvent(event);
      json(res, 200, mockRes.body);
      return;
    }

    const upstream = resolveUpstream();
    if (!upstream) {
      json(res, 501, {
        error: {
          message:
            "live upstream not configured; set TOKENPULSE_MOCK_UPSTREAM=1 or provide TOKENPULSE_UPSTREAM_* / OPENAI_API_KEY / XAI_API_KEY",
          type: "not_implemented",
        },
      });
      return;
    }

    try {
      const live = await liveChatCompletion(parsed.data, upstream);
      const latencyMs = Date.now() - started;
      const event = newEvent({
        teamId,
        appId,
        model: parsed.data.model,
        promptTokens: live.usage.promptTokens,
        completionTokens: live.usage.completionTokens,
        totalTokens: live.usage.totalTokens,
        estimatedCostUsd: estimateCostUsd(
          parsed.data.model,
          live.usage.promptTokens,
          live.usage.completionTokens,
        ),
        latencyMs,
        decision: "allow",
        policyIds: [budget.policyId, "live-allow", `upstream:${upstream.source}`],
        requestHash: requestHash({ model: parsed.data.model, n: parsed.data.messages.length }),
      });
      await appendEvent(event);
      json(res, 200, live.body);
      return;
    } catch (err) {
      const latencyMs = Date.now() - started;
      const message = err instanceof Error ? err.message : "upstream_error";
      const event = newEvent({
        teamId,
        appId,
        model: parsed.data.model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        latencyMs,
        decision: "block",
        policyIds: [budget.policyId, "upstream_error"],
        requestHash: requestHash({ model: parsed.data.model, n: parsed.data.messages.length }),
      });
      await appendEvent(event);
      const status = typeof err === "object" && err && "status" in err ? Number((err as { status: number }).status) || 502 : 502;
      json(res, status >= 400 && status < 600 ? status : 502, {
        error: { message, type: "upstream_error" },
      });
      return;
    }
  }

  json(res, 404, { error: { message: "not found", type: "invalid_request_error" } });
}

export function startGateway(port = Number(process.env.TOKENPULSE_GATEWAY_PORT ?? DEFAULT_PORT)) {
  const host = process.env.TOKENPULSE_GATEWAY_HOST ?? "127.0.0.1";
  const server = createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      console.error(err);
      if (!res.headersSent) json(res, 500, { error: { message: "internal_error", type: "server_error" } });
    });
  });
  server.listen(port, host, () => {
    console.error(`tokenpulse gateway on http://${host}:${port} mock=${process.env.TOKENPULSE_MOCK_UPSTREAM ?? "0"}`);
  });
  return server;
}

const isMain = process.argv[1]?.endsWith("gateway.ts") || process.argv[1]?.endsWith("gateway.js");
if (isMain) startGateway();
