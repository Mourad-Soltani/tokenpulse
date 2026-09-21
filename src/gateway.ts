import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { ChatCompletionRequestSchema, EmbeddingRequestSchema, embeddingInputs } from "./types.js";
import { appendEvent, appendOperatorNote, newEvent, readEvents, requestHash } from "./ledger.js";
import { estimateCostUsd } from "./pricing.js";
import { mockChatCompletion, mockChatCompletionStream, mockEmbeddings } from "./mockUpstream.js";
import { evaluateBudget } from "./budget.js";
import { evaluateModelPolicy, listVisibleModelsAsync } from "./models.js";
import { evaluateSensitive } from "./sensitive.js";
import { evaluateRateLimit } from "./ratelimit.js";
import { evaluateLimits, promptCharCount } from "./limits.js";
import { isMockUpstream, liveChatCompletion, liveChatCompletionStream, liveEmbeddings, resolveUpstream } from "./upstream.js";
import { adminSummary, dashboardHtml } from "./admin.js";
import { buildFinopsPack, buildSecurityPack, finopsCsv, securityCsv } from "./export.js";

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

  if (req.method === "GET" && (url.pathname === "/v1/models" || url.pathname === "/models")) {
    const data = await listVisibleModelsAsync();
    json(res, 200, { object: "list", data });
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
    const wantStream = Boolean(parsed.data.stream);

    const teamId = header(req, "x-tokenpulse-team") || "default";
    const appId = header(req, "x-tokenpulse-app") || "default";
    const mock = isMockUpstream();

    const limits = await evaluateLimits({
      teamId,
      promptChars: promptCharCount(parsed.data.messages),
      requestedMaxTokens: parsed.data.max_tokens,
    });
    if (!limits.allow) {
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
        policyIds: [limits.policyId],
        requestHash: requestHash({ model: parsed.data.model, n: parsed.data.messages.length }),
      });
      await appendEvent(event);
      json(res, 413, {
        error: {
          message: limits.reason ?? "request exceeds size limits",
          type: "limit_exceeded",
          promptChars: limits.promptChars,
          maxPromptChars: limits.maxPromptChars,
          requestedMaxTokens: limits.requestedMaxTokens,
          capMaxTokens: limits.capMaxTokens,
        },
      });
      return;
    }

    const sensitive = evaluateSensitive(parsed.data.messages);
    if (!sensitive.allow) {
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
        policyIds: [sensitive.policyId, ...sensitive.categories.map((c) => `sensitive:${c}`)],
        requestHash: requestHash({ model: parsed.data.model, n: parsed.data.messages.length }),
      });
      await appendEvent(event);
      json(res, 403, {
        error: {
          message: sensitive.reason ?? "sensitive payload blocked",
          type: "sensitive_payload",
          categories: sensitive.categories,
        },
      });
      return;
    }

    const modelPolicy = await evaluateModelPolicy(parsed.data.model);
    if (!modelPolicy.allow) {
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
        policyIds: [modelPolicy.policyId],
        requestHash: requestHash({ model: parsed.data.model, n: parsed.data.messages.length }),
      });
      await appendEvent(event);
      json(res, 403, {
        error: {
          message: modelPolicy.reason ?? "model not allowed",
          type: "model_denied",
          model: parsed.data.model,
        },
      });
      return;
    }

    const rate = await evaluateRateLimit(teamId, appId);
    if (!rate.allow) {
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
        policyIds: [rate.policyId],
        requestHash: requestHash({ model: parsed.data.model, n: parsed.data.messages.length }),
      });
      await appendEvent(event);
      res.setHeader("Retry-After", String(Math.ceil(rate.retryAfterMs / 1000)));
      json(res, 429, {
        error: {
          message: rate.reason ?? "rate limited",
          type: "rate_limited",
          team: teamId,
          app: appId,
          scope: rate.scope,
          capRpm: rate.capRpm,
          retryAfterMs: rate.retryAfterMs,
        },
      });
      return;
    }

    const budget = await evaluateBudget(teamId, appId);
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
          message: budget.reason ?? "budget exceeded",
          type: "budget_exceeded",
          team: teamId,
          app: appId,
          scope: budget.scope,
          spentUsd: budget.spentUsd,
          capUsd: budget.capUsd,
          period: budget.period,
        },
      });
      return;
    }

    if (mock) {
      if (wantStream) {
        const streamRes = mockChatCompletionStream(parsed.data);
        res.writeHead(200, {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });
        for (const chunk of streamRes.chunks) {
          res.write(chunk);
        }
        const latencyMs = Date.now() - started;
        const event = newEvent({
          teamId,
          appId,
          model: parsed.data.model,
          promptTokens: streamRes.usage.promptTokens,
          completionTokens: streamRes.usage.completionTokens,
          totalTokens: streamRes.usage.totalTokens,
          estimatedCostUsd: estimateCostUsd(
            parsed.data.model,
            streamRes.usage.promptTokens,
            streamRes.usage.completionTokens,
          ),
          latencyMs,
          decision: "allow",
          policyIds: [modelPolicy.policyId, budget.policyId, "mock-allow", "stream"],
          requestHash: requestHash({ model: parsed.data.model, n: parsed.data.messages.length, stream: true }),
        });
        await appendEvent(event);
        res.end();
        return;
      }
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
        policyIds: [modelPolicy.policyId, budget.policyId, "mock-allow"],
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
      if (wantStream) {
        res.writeHead(200, {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });
        const streamResult = await liveChatCompletionStream(parsed.data, upstream, (chunk) => {
          res.write(chunk);
        });
        const latencyMs = Date.now() - started;
        const event = newEvent({
          teamId,
          appId,
          model: parsed.data.model,
          promptTokens: streamResult.usage.promptTokens,
          completionTokens: streamResult.usage.completionTokens,
          totalTokens: streamResult.usage.totalTokens,
          estimatedCostUsd: estimateCostUsd(
            parsed.data.model,
            streamResult.usage.promptTokens,
            streamResult.usage.completionTokens,
          ),
          latencyMs,
          decision: "allow",
          policyIds: [
            modelPolicy.policyId,
            budget.policyId,
            "live-allow",
            `upstream:${upstream.source}`,
            "stream",
          ],
          requestHash: requestHash({ model: parsed.data.model, n: parsed.data.messages.length, stream: true }),
        });
        await appendEvent(event);
        res.end();
        return;
      }
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
        policyIds: [modelPolicy.policyId, budget.policyId, "live-allow", `upstream:${upstream.source}`],
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
        policyIds: [modelPolicy.policyId, budget.policyId, "upstream_error", ...(wantStream ? ["stream"] : [])],
        requestHash: requestHash({ model: parsed.data.model, n: parsed.data.messages.length, stream: wantStream }),
      });
      await appendEvent(event);
      const status = typeof err === "object" && err && "status" in err ? Number((err as { status: number }).status) || 502 : 502;
      if (!res.headersSent) {
        json(res, status >= 400 && status < 600 ? status : 502, {
          error: { message, type: "upstream_error" },
        });
      } else {
        res.end();
      }
      return;
    }
  }


  if (req.method === "POST" && (url.pathname === "/v1/embeddings" || url.pathname === "/embeddings")) {
    const started = Date.now();
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(await readBody(req));
    } catch {
      json(res, 400, { error: { message: "invalid json", type: "invalid_request_error" } });
      return;
    }
    const parsed = EmbeddingRequestSchema.safeParse(parsedJson);
    if (!parsed.success) {
      json(res, 400, { error: { message: parsed.error.message, type: "invalid_request_error" } });
      return;
    }

    const texts = embeddingInputs(parsed.data);
    const teamId = header(req, "x-tokenpulse-team") || "default";
    const appId = header(req, "x-tokenpulse-app") || "default";
    const mock = isMockUpstream();

    const limits = await evaluateLimits({
      teamId,
      promptChars: promptCharCount(texts),
    });
    if (!limits.allow) {
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
        policyIds: [limits.policyId, "endpoint:embeddings"],
        requestHash: requestHash({ model: parsed.data.model, n: texts.length, endpoint: "embeddings" }),
      });
      await appendEvent(event);
      json(res, 413, {
        error: {
          message: limits.reason ?? "request exceeds size limits",
          type: "limit_exceeded",
          promptChars: limits.promptChars,
          maxPromptChars: limits.maxPromptChars,
        },
      });
      return;
    }

    const sensitive = evaluateSensitive(texts.map((content) => ({ content })));
    if (!sensitive.allow) {
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
        policyIds: [sensitive.policyId, ...sensitive.categories.map((c) => `sensitive:${c}`), "endpoint:embeddings"],
        requestHash: requestHash({ model: parsed.data.model, n: texts.length, endpoint: "embeddings" }),
      });
      await appendEvent(event);
      json(res, 403, {
        error: {
          message: sensitive.reason ?? "sensitive payload blocked",
          type: "sensitive_payload",
          categories: sensitive.categories,
        },
      });
      return;
    }

    const modelPolicy = await evaluateModelPolicy(parsed.data.model);
    if (!modelPolicy.allow) {
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
        policyIds: [modelPolicy.policyId, "endpoint:embeddings"],
        requestHash: requestHash({ model: parsed.data.model, n: texts.length, endpoint: "embeddings" }),
      });
      await appendEvent(event);
      json(res, 403, {
        error: {
          message: modelPolicy.reason ?? "model not allowed",
          type: "model_denied",
          model: parsed.data.model,
        },
      });
      return;
    }

    const rate = await evaluateRateLimit(teamId, appId);
    if (!rate.allow) {
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
        policyIds: [rate.policyId, "endpoint:embeddings"],
        requestHash: requestHash({ model: parsed.data.model, n: texts.length, endpoint: "embeddings" }),
      });
      await appendEvent(event);
      res.setHeader("Retry-After", String(Math.ceil((rate.retryAfterMs ?? 1000) / 1000)));
      json(res, 429, {
        error: {
          message: rate.reason ?? "rate limited",
          type: "rate_limited",
          team: teamId,
          app: appId,
          scope: rate.scope,
          capRpm: rate.capRpm,
          retryAfterMs: rate.retryAfterMs,
        },
      });
      return;
    }

    const budget = await evaluateBudget(teamId, appId);
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
        policyIds: [budget.policyId, "endpoint:embeddings"],
        requestHash: requestHash({ model: parsed.data.model, n: texts.length, endpoint: "embeddings" }),
      });
      await appendEvent(event);
      json(res, 429, {
        error: {
          message: budget.reason ?? "budget exceeded",
          type: "budget_exceeded",
          team: teamId,
          app: appId,
          scope: budget.scope,
          spentUsd: budget.spentUsd,
          capUsd: budget.capUsd,
          period: budget.period,
        },
      });
      return;
    }

    if (mock) {
      const mockRes = mockEmbeddings(parsed.data);
      const latencyMs = Date.now() - started;
      const event = newEvent({
        teamId,
        appId,
        model: parsed.data.model,
        promptTokens: mockRes.usage.promptTokens,
        completionTokens: 0,
        totalTokens: mockRes.usage.totalTokens,
        estimatedCostUsd: estimateCostUsd(parsed.data.model, mockRes.usage.promptTokens, 0),
        latencyMs,
        decision: "allow",
        policyIds: [modelPolicy.policyId, budget.policyId, "mock-allow", "endpoint:embeddings"],
        requestHash: requestHash({ model: parsed.data.model, n: texts.length, endpoint: "embeddings" }),
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
      const live = await liveEmbeddings(parsed.data, upstream);
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
        policyIds: [modelPolicy.policyId, budget.policyId, "live-allow", `upstream:${upstream.source}`, "endpoint:embeddings"],
        requestHash: requestHash({ model: parsed.data.model, n: texts.length, endpoint: "embeddings" }),
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
        policyIds: [modelPolicy.policyId, budget.policyId, "upstream_error", "endpoint:embeddings"],
        requestHash: requestHash({ model: parsed.data.model, n: texts.length, endpoint: "embeddings" }),
      });
      await appendEvent(event);
      const status = typeof err === "object" && err && "status" in err ? Number((err as { status: number }).status) || 502 : 502;
      json(res, status >= 400 && status < 600 ? status : 502, {
        error: { message, type: "upstream_error" },
      });
      return;
    }
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/dashboard")) {
    const html = dashboardHtml();
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "content-length": Buffer.byteLength(html),
    });
    res.end(html);
    return;
  }

  if (req.method === "POST" && url.pathname === "/v1/admin/note") {
    const raw = await readBody(req);
    let body: { text?: string; teamId?: string; appId?: string } = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      json(res, 400, { error: { message: "invalid json", type: "invalid_request_error" } });
      return;
    }
    try {
      const event = await appendOperatorNote({
        text: String(body.text ?? ""),
        teamId: body.teamId,
        appId: body.appId,
      });
      json(res, 200, { ok: true, event });
    } catch (err) {
      const message = err instanceof Error ? err.message : "note_invalid";
      json(res, 400, { error: { message, type: "invalid_request_error" } });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/v1/admin/summary") {
    const day = url.searchParams.get("day") ?? undefined;
    const summary = await adminSummary({ day });
    json(res, 200, summary);
    return;
  }

  if (req.method === "GET" && url.pathname === "/v1/admin/events") {
    const day = url.searchParams.get("day") ?? undefined;
    const decision = url.searchParams.get("decision");
    let events = await readEvents({ day });
    if (decision === "allow" || decision === "block") {
      events = events.filter((e) => e.decision === decision);
    }
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50) || 50, 1), 200);
    json(res, 200, { events: events.slice(-limit).reverse() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/v1/admin/export/finops") {
    const day = url.searchParams.get("day") ?? undefined;
    const events = await readEvents({ day });
    const pack = buildFinopsPack(events, { day });
    if (url.searchParams.get("format") === "csv") {
      const csv = finopsCsv(pack);
      res.writeHead(200, {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="tokenpulse-finops.csv"',
        "content-length": Buffer.byteLength(csv),
      });
      res.end(csv);
      return;
    }
    json(res, 200, pack);
    return;
  }

  if (req.method === "GET" && url.pathname === "/v1/admin/export/security") {
    const day = url.searchParams.get("day") ?? undefined;
    const events = await readEvents({ day });
    const pack = buildSecurityPack(events, { day });
    if (url.searchParams.get("format") === "csv") {
      const csv = securityCsv(pack);
      res.writeHead(200, {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="tokenpulse-security.csv"',
        "content-length": Buffer.byteLength(csv),
      });
      res.end(csv);
      return;
    }
    json(res, 200, pack);
    return;
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
