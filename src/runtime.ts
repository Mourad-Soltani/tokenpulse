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

/** Operator-visible bind + auth flags. Never includes the gateway token. */
export function gatewayStatus(): GatewayRuntimeStatus {
  const host = process.env.TOKENPULSE_GATEWAY_HOST?.trim() || DEFAULT_HOST;
  const parsed = Number(process.env.TOKENPULSE_GATEWAY_PORT ?? DEFAULT_PORT);
  const port = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
  return {
    host,
    port,
    mockUpstream: process.env.TOKENPULSE_MOCK_UPSTREAM === "1",
    authRequired: Boolean(process.env.TOKENPULSE_GATEWAY_TOKEN),
    loopback: isLoopback(host),
  };
}
