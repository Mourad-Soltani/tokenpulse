import { createHash } from "node:crypto";
import type { UsageEvent } from "./types.js";

/** Canonical SHA-256 over event fields + prevHash. Hash/prevHash themselves are excluded from the body except prevHash as the link. */
export function eventDigest(event: UsageEvent, prevHash: string): string {
  const body = {
    id: event.id,
    timestamp: event.timestamp,
    teamId: event.teamId,
    appId: event.appId,
    model: event.model,
    promptTokens: event.promptTokens,
    completionTokens: event.completionTokens,
    totalTokens: event.totalTokens,
    estimatedCostUsd: event.estimatedCostUsd,
    latencyMs: event.latencyMs,
    decision: event.decision,
    policyIds: event.policyIds,
    requestHash: event.requestHash ?? "",
    note: event.note ?? "",
    prevHash,
  };
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

export function sealEvent(event: UsageEvent, prevHash: string): UsageEvent {
  return { ...event, prevHash, hash: eventDigest(event, prevHash) };
}

export type ChainReport = {
  ok: boolean;
  checked: number;
  skippedLegacy: number;
  brokenAt?: string;
  tipHash?: string;
};

export function verifyChain(events: UsageEvent[]): ChainReport {
  let prev = "";
  let checked = 0;
  let skippedLegacy = 0;
  let seenHashed = false;
  for (const e of events) {
    if (!e.hash) {
      skippedLegacy += 1;
      continue;
    }
    const link = e.prevHash ?? "";
    if (seenHashed && link !== prev) {
      return { ok: false, checked, skippedLegacy, brokenAt: e.id, tipHash: prev || undefined };
    }
    const expected = eventDigest(e, link);
    if (expected !== e.hash) {
      return { ok: false, checked, skippedLegacy, brokenAt: e.id, tipHash: prev || undefined };
    }
    prev = e.hash;
    checked += 1;
    seenHashed = true;
  }
  return { ok: true, checked, skippedLegacy, tipHash: prev || undefined };
}

export function lastHash(events: UsageEvent[]): string {
  for (let i = events.length - 1; i >= 0; i--) {
    const h = events[i]?.hash;
    if (h) return h;
  }
  return "";
}
