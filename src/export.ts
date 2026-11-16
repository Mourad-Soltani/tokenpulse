import { summarize, verifyChain } from "./ledger.js";
import { policyRoiStatus } from "./policyRoi.js";
import { annualProjectionStatus } from "./annualProjection.js";
import { annualAvoidedStatus } from "./annualAvoided.js";
import { requestVolumeStatus } from "./requestVolume.js";
import { modelBlockRateStatus } from "./modelBlockRate.js";
import { scaleModelStatus } from "./scaleModel.js";
import type { UsageEvent } from "./types.js";

/** True when ledger includes the synthetic demo seed note. */
export function isDemoDataset(events: UsageEvent[]): boolean {
  return events.some(
    (e) =>
      e.decision === "note" &&
      (e.policyIds?.includes("demo-seed") ||
        /DEMO DATA|Demo seed|synthetic/i.test(String(e.note || ""))),
  );
}


export const FINOPS_PACK_VERSION = "tokenpulse-finops-v1";
export const SECURITY_PACK_VERSION = "tokenpulse-security-v1";

export type ExportStatus = {
  finopsVersion: typeof FINOPS_PACK_VERSION;
  securityVersion: typeof SECURITY_PACK_VERSION;
  formats: ["json", "csv"];
  includesRawPrompts: false;
  notesOmittedFromFinopsRows: true;
};

/** Operator-visible pack metadata. No event payloads. */
export function exportStatus(): ExportStatus {
  return {
    finopsVersion: FINOPS_PACK_VERSION,
    securityVersion: SECURITY_PACK_VERSION,
    formats: ["json", "csv"],
    includesRawPrompts: false,
    notesOmittedFromFinopsRows: true,
  };
}

export type FinopsPack = {
  version: typeof FINOPS_PACK_VERSION;
  generatedAt: string;
  /** Present when ledger was populated by seed-demo (synthetic). */
  demoDataset?: true;
  demoLabel?: string;
  day?: string;
  summary: ReturnType<typeof summarize>;
  policyRoi: ReturnType<typeof policyRoiStatus>;
  annual: ReturnType<typeof annualProjectionStatus>;
  annualAvoided: ReturnType<typeof annualAvoidedStatus>;
  requestVolume: ReturnType<typeof requestVolumeStatus>;
  modelBlockRate: ReturnType<typeof modelBlockRateStatus>;
  scaleModel: ReturnType<typeof scaleModelStatus>;
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
  demoDataset?: true;
  demoLabel?: string;
  day?: string;
  chainOk: boolean;
  chainChecked: number;
  blocked: number;
  allowed: number;
  requestVolume: ReturnType<typeof requestVolumeStatus>;
  modelBlockRate: ReturnType<typeof modelBlockRateStatus>;
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
    requestId?: string;
  }>;
};

export function buildFinopsPack(events: UsageEvent[], opts?: { day?: string; now?: string }): FinopsPack {
  const demo = isDemoDataset(events);
  return {
    version: FINOPS_PACK_VERSION,
    generatedAt: opts?.now ?? new Date().toISOString(),
    ...(demo
      ? {
          demoDataset: true as const,
          demoLabel: "DEMO DATA — SIMULATED multi-day enterprise traffic. No production customer data.",
        }
      : {}),
    day: opts?.day,
    summary: summarize(events),
    policyRoi: policyRoiStatus(events),
    annual: annualProjectionStatus(events),
    annualAvoided: annualAvoidedStatus(events),
    requestVolume: requestVolumeStatus(events),
    modelBlockRate: modelBlockRateStatus(events),
    scaleModel: scaleModelStatus(events),
    events: events.filter((e) => e.decision !== "note").map((e) => ({
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
  const demo = isDemoDataset(events);
  return {
    version: SECURITY_PACK_VERSION,
    generatedAt: opts?.now ?? new Date().toISOString(),
    ...(demo
      ? {
          demoDataset: true as const,
          demoLabel: "DEMO DATA — SIMULATED multi-day enterprise traffic. No production customer data.",
        }
      : {}),
    day: opts?.day,
    chainOk: chain.ok,
    chainChecked: chain.checked,
    blocked: blocked.length,
    allowed: events.filter((e) => e.decision === "allow").length,
    requestVolume: requestVolumeStatus(events),
    modelBlockRate: modelBlockRateStatus(events),
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
      requestId: e.requestId,
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
  const header = ["id", "timestamp", "teamId", "appId", "model", "policyIds", "requestHash", "requestId"];
  const lines = [header.join(",")];
  for (const e of pack.events) {
    lines.push(
      [e.id, e.timestamp, e.teamId, e.appId, e.model, e.policyIds.join("|"), e.requestHash ?? "", e.requestId ?? ""]
        .map(csvEscape)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
