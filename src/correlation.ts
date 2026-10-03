import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "X-Tokenpulse-Request-Id";

const store = new AsyncLocalStorage<string>();

/** Client-supplied ids must be opaque tokens, not free text. */
const CLIENT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,63}$/;

export function isSafeRequestId(raw: string | undefined): boolean {
  return CLIENT_ID.test((raw ?? "").trim());
}

export function resolveRequestId(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (isSafeRequestId(trimmed)) return trimmed;
  return `tp_${randomUUID().replaceAll("-", "")}`;
}

/** Bind the id for the current request so ledger writes can pick it up. */
export function bindRequestId(requestId: string): void {
  store.enterWith(requestId);
}

export function currentRequestId(): string | undefined {
  return store.getStore();
}

export type CorrelationStatus = {
  version: "tokenpulse-correlation-v1";
  header: string;
  ledgerField: "requestId";
  inHashChain: false;
  storesRawPrompts: false;
  notes: string;
};

/** Operator-visible correlation contract. Never serializes live request ids. */
export function correlationStatus(): CorrelationStatus {
  return {
    version: "tokenpulse-correlation-v1",
    header: REQUEST_ID_HEADER,
    ledgerField: "requestId",
    inHashChain: false,
    storesRawPrompts: false,
    notes: "Echoed on every response. Client id accepted when 8–64 chars of [A-Za-z0-9._:-]. Otherwise generated. Not part of the SHA-256 chain body. Lookup: GET /v1/admin/events?requestId= or CLI --request-id= (exact match, no raw prompts).",
  };
}
