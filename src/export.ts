import { summarize, verifyChain } from "./ledger.js";
import type { UsageEvent } from "./types.js";

export const FINOPS_PACK_VERSION = "tokenpulse-finops-v1";
export const SECURITY_PACK_VERSION = "tokenpulse-security-v1";

export type FinopsPack = {
  version: typeof FINOPS_PACK_VERSION;
  generatedAt: string;
  day?: string;
  summary: ReturnType<typeof summarize>;
  events: Array<{
    id: string;
    timestamp: string;
    teamId: string;
    appId: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    decision: UsageEvent["decision"];
  }>;
};

export type SecurityPack = {
  version: typeof SECURITY_PACK_VERSION;
  generatedAt: string;
  day?: string;
  chainOk: boolean;
  chainChecked: number;
  blocked: number;
  allowed: number;
  policyHits: Record<string, number>;
  blockedByTeam: Record<string, number>;
  events: Array<{
    id: string;
    timestamp: string;
    teamId: string;
    appId: string;
    model: string;
    decision: "block";
    policyIds: string[];
    requestHash?: string;
  }>;
};

export function buildFinopsPack(events: UsageEvent[], opts?: { day?: string; now?: string }): FinopsPack {
  return {
    version: FINOPS_PACK_VERSION,
    generatedAt: opts?.now ?? new Date().toISOString(),
    day: opts?.day,
    summary: summarize(events),
    events: events.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      teamId: e.teamId,
      appId: e.appId,
      model: e.model,
      promptTokens: e.promptTokens,
      completionTokens: e.completionTokens,
      totalTokens: e.totalTokens,
      estimatedCostUsd: e.estimatedCostUsd,
      decision: e.decision,
    })),
  };
}

export function buildSecurityPack(events: UsageEvent[], opts?: { day?: string; now?: string }): SecurityPack {
  const blocked = events.filter((e) => e.decision === "block");
  const policyHits: Record<string, number> = {};
  const blockedByTeam: Record<string, number> = {};
  for (const e of blocked) {
    blockedByTeam[e.teamId] = (blockedByTeam[e.teamId] ?? 0) + 1;
    for (const id of e.policyIds) {
      policyHits[id] = (policyHits[id] ?? 0) + 1;
    }
  }
  const chain = verifyChain(events);
  return {
    version: SECURITY_PACK_VERSION,
    generatedAt: opts?.now ?? new Date().toISOString(),
    day: opts?.day,
    chainOk: chain.ok,
    chainChecked: chain.checked,
    blocked: blocked.length,
    allowed: events.filter((e) => e.decision === "allow").length,
    policyHits,
    blockedByTeam,
    events: blocked.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      teamId: e.teamId,
      appId: e.appId,
      model: e.model,
      decision: "block" as const,
      policyIds: e.policyIds,
      requestHash: e.requestHash,
    })),
  };
}

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export function finopsCsv(pack: FinopsPack): string {
  const header = [
    "id",
    "timestamp",
    "teamId",
    "appId",
    "model",
    "promptTokens",
    "completionTokens",
    "totalTokens",
    "estimatedCostUsd",
    "decision",
  ];
  const lines = [header.join(",")];
  for (const e of pack.events) {
    lines.push(
      [
        e.id,
        e.timestamp,
        e.teamId,
        e.appId,
        e.model,
        e.promptTokens,
        e.completionTokens,
        e.totalTokens,
        e.estimatedCostUsd,
        e.decision,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function securityCsv(pack: SecurityPack): string {
  const header = ["id", "timestamp", "teamId", "appId", "model", "policyIds", "requestHash"];
  const lines = [header.join(",")];
  for (const e of pack.events) {
    lines.push(
      [e.id, e.timestamp, e.teamId, e.appId, e.model, e.policyIds.join("|"), e.requestHash ?? ""]
        .map(csvEscape)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
