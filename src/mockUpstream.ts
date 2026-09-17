import { createHash } from "node:crypto";
import type { ChatCompletionRequest, EmbeddingRequest } from "./types.js";
import { embeddingInputs } from "./types.js";

function estimatePromptTokens(req: ChatCompletionRequest): number {
  const chars = req.messages.reduce((n, m) => n + (m.content?.length ?? 0), 0);
  return Math.max(1, Math.ceil(chars / 4));
}

export function mockChatCompletion(req: ChatCompletionRequest) {
  const promptTokens = estimatePromptTokens(req);
  const last = req.messages[req.messages.length - 1]?.content ?? "";
  const content = `tokenpulse-mock: received ${req.messages.length} message(s) for ${req.model}. last="${last.slice(0, 80)}"`;
  const completionTokens = Math.max(1, Math.ceil(content.length / 4));
  const id = `chatcmpl_mock_${createHash("sha256").update(content).digest("hex").slice(0, 12)}`;
  return {
    body: {
      id,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: req.model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    },
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
  };
}


function estimateEmbedTokens(texts: string[]): number {
  const chars = texts.reduce((n, s) => n + s.length, 0);
  return Math.max(1, Math.ceil(chars / 4));
}

function mockVector(text: string, dim: number): number[] {
  const digest = createHash("sha256").update(text).digest();
  const out: number[] = [];
  for (let i = 0; i < dim; i++) {
    const b = digest[i % digest.length] ?? 0;
    out.push(((b / 255) * 2 - 1) * (1 - i / dim));
  }
  return out;
}

export function mockEmbeddings(req: EmbeddingRequest) {
  const texts = embeddingInputs(req);
  const promptTokens = estimateEmbedTokens(texts);
  const dim = Math.min(req.dimensions ?? 8, 32);
  const data = texts.map((text, index) => ({
    object: "embedding",
    index,
    embedding: mockVector(text, dim),
  }));
  const id = `emb_mock_${createHash("sha256").update(texts.join("\n")).digest("hex").slice(0, 12)}`;
  return {
    body: {
      object: "list",
      data,
      model: req.model,
      usage: { prompt_tokens: promptTokens, total_tokens: promptTokens },
      id,
    },
    usage: {
      promptTokens,
      completionTokens: 0,
      totalTokens: promptTokens,
    },
  };
}
