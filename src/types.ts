import { z } from "zod";

export const UsageEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  teamId: z.string(),
  appId: z.string(),
  model: z.string(),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  estimatedCostUsd: z.number().nonnegative(),
  latencyMs: z.number().nonnegative(),
  decision: z.enum(["allow", "block"]),
  policyIds: z.array(z.string()),
  requestHash: z.string().optional(),
});

export type UsageEvent = z.infer<typeof UsageEventSchema>;

export const ChatMessageSchema = z.object({
  role: z.string(),
  content: z.string().optional(),
});

export const ChatCompletionRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(ChatMessageSchema).min(1),
  stream: z.boolean().optional(),
  max_tokens: z.number().int().positive().optional(),
});

export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;
