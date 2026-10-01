const DEFAULT_PORT = 8788;
const DEFAULT_HOST = "127.0.0.1";

export type GatewayRuntimeStatus = {
  host: string;
  port: number;
  mockUpstream: boolean;
  authRequired: boolean;
  loopback: boolean;
};

function isLoopback(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function parsePort(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** TOKENPULSE_GATEWAY_PORT wins; else platform PORT (Railway/Fly); else 8788. */
export function listenPort(): number {
  if (process.env.TOKENPULSE_GATEWAY_PORT?.trim()) {
    return parsePort(process.env.TOKENPULSE_GATEWAY_PORT, DEFAULT_PORT);
  }
  return parsePort(process.env.PORT, DEFAULT_PORT);
}

/** Explicit host wins; platform PORT implies 0.0.0.0; else loopback. */
export function listenHost(): string {
  const explicit = process.env.TOKENPULSE_GATEWAY_HOST?.trim();
  if (explicit) return explicit;
  if (process.env.PORT?.trim()) return "0.0.0.0";
  return DEFAULT_HOST;
}

/** Operator-visible bind + auth flags. Never includes the gateway token. */
export function gatewayStatus(): GatewayRuntimeStatus {
  const host = listenHost();
  return {
    host,
    port: listenPort(),
    mockUpstream: process.env.TOKENPULSE_MOCK_UPSTREAM === "1",
    authRequired: Boolean(process.env.TOKENPULSE_GATEWAY_TOKEN),
    loopback: isLoopback(host),
  };
}
