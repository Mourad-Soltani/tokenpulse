# Tokenpulse observability (Prometheus + Grafana)

Tokenpulse exposes a Prometheus-compatible metrics endpoint for operators. No secrets, no raw prompts, no digests.

## Endpoint

```
GET /v1/admin/metrics
Authorization: Bearer <TOKENPULSE_GATEWAY_TOKEN>
```

Optional query: `?day=YYYY-MM-DD` (defaults to today UTC).

Returns `text/plain; version=0.0.4`.

## Metrics

| Metric | Type | Meaning |
|--------|------|---------|
| `tokenpulse_calls_total` | counter | allow + block + note |
| `tokenpulse_allowed_total` | counter | allowed requests |
| `tokenpulse_blocked_total` | counter | blocked requests |
| `tokenpulse_notes_total` | counter | operator notes |
| `tokenpulse_tokens_total` | counter | prompt + completion tokens |
| `tokenpulse_cost_usd_total` | counter | estimated USD |
| `tokenpulse_alerts_count` | gauge | current warn count |
| `tokenpulse_discovery_unknown_cost_usd` | gauge | spend on unknown models |
| `tokenpulse_unattributed_cost_usd` | gauge | spend on default team/app |
| `tokenpulse_chain_ok` | gauge | 1 if chain verifies |
| `tokenpulse_latency_avg_ms` | gauge | average latency |
| `tokenpulse_latency_p95_ms` | gauge | p95 latency |
| `tokenpulse_upstream_success_rate_percent` | gauge | allow / (allow + upstream_error) |
| `tokenpulse_upstream_failures_total` | counter | upstream_error blocks |

## Scrape example (Prometheus)

```yaml
scrape_configs:
  - job_name: tokenpulse
    scheme: https          # or http for loopback
    metrics_path: /v1/admin/metrics
    bearer_token: <your-gateway-token>
    static_configs:
      - targets: ["your-railway-domain.up.railway.app"]
```

For a local gateway:

```yaml
  - job_name: tokenpulse-local
    metrics_path: /v1/admin/metrics
    bearer_token: dev-local-token
    static_configs:
      - targets: ["127.0.0.1:8788"]
```

## Grafana

Import `docs/grafana-tokenpulse.json` (basic panels for calls, cost, latency, upstream success rate, alerts).

## Demo note

On a Railway public mock instance, generate a little traffic (chat + a couple of policy blocks) before showing the dashboard or metrics. Latency percentiles and upstream health need samples.

No provider keys are required or allowed on the prospect mock demo.
