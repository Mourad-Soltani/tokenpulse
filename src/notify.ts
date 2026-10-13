import type { AlertsStatus } from "./alerts.js";

export type WebhookStatus = {
  configured: boolean;
  host: string | null;
  notes: string;
};

/** Never returns the full URL (may contain tokens). Host only for dashboard. */
export function webhookStatus(): WebhookStatus {
  const raw = process.env.TOKENPULSE_ALERT_WEBHOOK_URL?.trim() || "";
  if (!raw) {
    return {
      configured: false,
      host: null,
      notes: "Set TOKENPULSE_ALERT_WEBHOOK_URL to POST alerts JSON on CLI --alerts. No secrets in git.",
    };
  }
  let host: string | null = null;
  try {
    host = new URL(raw).host;
  } catch {
    host = null;
  }
  return {
    configured: true,
    host,
    notes: "CLI --alerts POSTs the alerts object when this URL is set. Full URL is never serialized.",
  };
}

export async function postAlerts(alerts: AlertsStatus): Promise<{ ok: boolean; status?: number; error?: string }> {
  const raw = process.env.TOKENPULSE_ALERT_WEBHOOK_URL?.trim();
  if (!raw) return { ok: false, error: "webhook_not_configured" };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "invalid_url" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "https_or_http_required" };
  }
  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "tokenpulse-alerts/0.1" },
      body: JSON.stringify({ source: "tokenpulse", ...alerts }),
      signal: AbortSignal.timeout(10_000),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch_failed" };
  }
}
