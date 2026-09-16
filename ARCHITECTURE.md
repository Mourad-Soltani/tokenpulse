# Tokenpulse Architecture (v0.1)

## High-level

- **Gateway**: OpenAI-compatible HTTP proxy. Clients point `baseURL` at Tokenpulse instead of the provider.
- **Meter**: Every request/response records tokens, model, team, app, latency, policy decision.
- **Policy engine**: Budget caps, rate limits, model allow/deny, simple sensitive-data heuristics before egress.
- **Ledger**: Append-only usage events (JSON files for MVP → SQLite/Postgres later).
- **Export**: FinOps CSV/JSON and security audit packs.
- **Dashboard**: Spend by team/model/day, top blocked requests, policy hits.
- **Discovery (later)**: Inventory of known AI endpoints / browser signals (optional; not required for MVP).

## Differentiation

| Aether Forge (closed / client) | Tokenpulse (active) |
|--------------------------------|---------------------|
| Multi-agent workflow orchestrator | LLM traffic gateway + FinOps |
| HITL on irreversible tool steps | Policy before provider egress |
| Run audit for agent actions | Usage ledger for tokens & cost |
| Workflow dashboard | Spend & policy dashboard |

## Request path (v0.1)

1. Client sends OpenAI-compatible chat/completions (or embeddings) to gateway.
2. Authenticate gateway token (`TOKENPULSE_GATEWAY_TOKEN`).
3. Resolve `team` / `app` from header or API key mapping.
4. Run policy: budget remaining, model allowed, payload heuristics.
5. On deny → return structured error + ledger `blocked` event.
6. On allow → mock when `TOKENPULSE_MOCK_UPSTREAM=1`; else live forward via `resolveUpstream()`. Meter provider `usage`, append ledger, return body. Missing live config → 501. Upstream errors → ledger `block` + `upstream_error`.

Daily budget is evaluated **before** upstream. Cap source: `TOKENPULSE_BUDGETS_PATH` (`data/budgets.json` or `budgets.example.json`) then `TOKENPULSE_DEFAULT_DAILY_USD`. No cap configured → allow. `dailyUsd: 0` blocks the team immediately. Blocked calls write `decision: block` with zero tokens and HTTP 429 `budget_exceeded`.

## Data model (MVP)

```
UsageEvent {
  id, timestamp, teamId, appId, model,
  promptTokens, completionTokens, totalTokens,
  estimatedCostUsd, latencyMs,
  decision: "allow" | "block",
  policyIds: string[],
  requestHash?  // optional, never store raw prompts by default
}
```

Raw prompts are **off by default**. Optional redacted preview for blocked requests only.

## Persistence

Default: `data/ledger/<day>.jsonl` + `data/budgets.json`.

Optional SQLite (Session 8): set `TOKENPULSE_LEDGER_DRIVER=sqlite` and optional `TOKENPULSE_SQLITE_PATH` (default `data/ledger.sqlite`). Same `UsageEvent` schema. JSONL remains the demo default. Uses Node built-in `node:sqlite` (no native addon).

## Non-goals for MVP

- Full CASB / browser extension
- Training or fine-tuning
- Multi-tenant SaaS cloud (self-host first)
- Replacing Aether Forge workflow orchestration

## Stack

- TypeScript / Node 20+
- Zod for schemas
- Node `http` for gateway (no heavy framework required)
- Optional Next.js dashboard under `apps/web` after core meter works

## Security

- No secrets in repo
- Loopback default
- Timing-safe token compare
- Prompt storage opt-in and redacted

## Model policy (Session 4)

- Config file: `TOKENPULSE_MODELS_PATH` (default `data/models.json`). Example: `models.example.json`.
- Env overrides: `TOKENPULSE_MODEL_ALLOW` / `TOKENPULSE_MODEL_DENY` (comma-separated). Env replaces the matching file list when non-empty.
- Empty lists = all models allowed (`policyId: model-open`).
- Deny is evaluated first. Then a non-empty allow list must include the model.
- Denied requests: HTTP 403 `model_denied`, ledger `decision: block`, zero tokens. Evaluated before budget and upstream.


## Admin surface (Session 5)

- Same process as the gateway. Loopback default. Auth matches `TOKENPULSE_GATEWAY_TOKEN`.
- `GET /` and `GET /dashboard` — static HTML spend view (token in localStorage).
- `GET /v1/admin/summary` — CLI-equivalent rollup plus `recentBlocked`.
- `GET /v1/admin/events?decision=block|allow&day=YYYY-MM-DD&limit=50`.
- `GET /v1/admin/export/finops` and `/v1/admin/export/security` (`format=csv` optional).
- No raw prompts. Dashboard never reads JSONL from the browser.

## Export packs (Session 9)

- FinOps pack `tokenpulse-finops-v1`: summary + per-event token/cost rows. No latency, no prompt text.
- Security pack `tokenpulse-security-v1`: blocked events only, policy hit counts, `requestHash` only.
- CLI: `--export-finops` / `--export-security` with optional `--csv` and `--day=YYYY-MM-DD`.


## Sensitive payload heuristics (Session 6)

- Runs on message text after JSON validation and before model/budget/upstream.
- Default on. Disable with `TOKENPULSE_SENSITIVE=off`.
- Detectors: common API keys/PATs, PEM private keys, Bearer tokens, email, SSN-shaped, PAN-shaped numbers. Optional `TOKENPULSE_SENSITIVE_EXTRA` (`;;`-separated regexes) adds `custom`.
- Block: HTTP 403 `sensitive_payload`. Ledger `decision: block` with `policyIds` like `sensitive-block` + `sensitive:secret`. Matched text is never written.


## Rate limits (Session 7)

- Config file: `TOKENPULSE_RATES_PATH` (default `data/rates.json`). Example: `rates.example.json`.
- Env: `TOKENPULSE_DEFAULT_RPM`, `TOKENPULSE_RATE_WINDOW_MS` (default 60s).
- Per-team `rpm` overrides default. Missing config = unlimited. `rpm: 0` hard-blocks.
- In-process sliding window (single gateway process). Counts attempts that pass earlier policies.
- Denied: HTTP 429 `rate_limited`, `Retry-After`, ledger `decision: block`, `policyId: rate-limited`.
- Evaluated after model policy and before budget/upstream.
