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

1. Client sends OpenAI-compatible chat/completions, embeddings, or `GET /v1/models` to gateway.
2. Authenticate gateway token (`TOKENPULSE_GATEWAY_TOKEN`). `GET /v1/models` lists pricing-catalog + extra allow-list ids that pass deny/allow; it does not write the ledger.
3. Resolve `team` / `app` from header or API key mapping.
4. Run policy: request size limits, payload heuristics, model allowed, rate, budget remaining.
5. On deny → return structured error + ledger `blocked` event.
6. On allow → mock when `TOKENPULSE_MOCK_UPSTREAM=1`; else live forward via `resolveUpstream()`. Meter provider `usage`, append ledger, return body. Missing live config → 501. Upstream errors → ledger `block` + `upstream_error`.

Daily and monthly budgets are evaluated **before** upstream. Cap source: `TOKENPULSE_BUDGETS_PATH` then `TOKENPULSE_DEFAULT_DAILY_USD` / `TOKENPULSE_DEFAULT_MONTHLY_USD`. No cap configured → allow. `dailyUsd: 0` or `monthlyUsd: 0` hard-blocks. Daily is checked first, then monthly. Blocked calls write `decision: block` with zero tokens and HTTP 429 `budget_exceeded` (`period: daily|monthly`).

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

## Request size limits (Session 11 + Session 20)

- Config file: `TOKENPULSE_LIMITS_PATH` (default `data/limits.json`). Example: `limits.example.json`.
- Env: `TOKENPULSE_MAX_PROMPT_CHARS`, `TOKENPULSE_MAX_TOKENS` as defaults when the file omits them.
- Per-team `maxPromptChars` / `maxTokens`. Missing config = unlimited. `maxTokens: 0` hard-blocks.
- Optional `apps` map keyed by `X-Tokenpulse-App`. App caps do not inherit team or default caps.
- Team caps evaluate first. App caps apply only if the team still allows.
- Prompt char count is the sum of message / embedding input string lengths (no raw text stored).
- Requested `max_tokens` above the cap is denied. Requests that omit `max_tokens` are allowed unless the cap is 0.
- Denied: HTTP 413 `limit_exceeded`, ledger `decision: block`.
- Team policy ids: `limit-prompt-chars` / `limit-max-tokens`. App: `limit-prompt-chars-app` / `limit-max-tokens-app`.
- Error payload includes `scope` (`team` | `app` | `none`) plus `team` / `app`.
- Evaluated after JSON validation and before sensitive / model / rate / budget / upstream.


## Embeddings (Session 10)

- `POST /v1/embeddings` and `/embeddings` accept `model` + `input` (string or string[]).
- Same policy order as chat: sensitive → model → rate → budget → mock or live upstream.
- Ledger `policyIds` include `endpoint:embeddings`. Completion tokens are zero; cost uses input price only.
- Mock returns a short deterministic vector (default dim 8, cap 32). Live forwards to `{baseUrl}/embeddings`.
- Streaming remains out of scope.


## Monthly budget (Session 12)

- Team field `monthlyUsd` and optional `defaultMonthlyUsd` / `TOKENPULSE_DEFAULT_MONTHLY_USD`.
- Spend is allowed events in the UTC month (`YYYY-MM`) across JSONL day files or SQLite.
- Policy id `budget-monthly-team`. Daily cap still wins when both are exhausted the same request.


## Streaming (Session 13)

- `stream: true` on chat completions returns OpenAI-compatible SSE (`text/event-stream`).
- Policy denials remain JSON errors (stream starts only after allow).
- Mock emits chunked deltas + final usage + `data: [DONE]`.
- Live upstream is forwarded with `stream_options.include_usage` when supported; usage falls back to char estimates if missing.
- Ledger records allow with policyId `stream` after the stream completes (before response end).
- Embeddings are non-streaming.


## Hash-chained ledger (Session 14)

- Each new `UsageEvent` is sealed with `prevHash` (previous event `hash`, or `""` for genesis) and `hash` (SHA-256 of canonical fields + prevHash).
- JSONL and SQLite both persist the two fields.
- `verifyChain` skips legacy events that have no `hash`.
- CLI: `npx tsx src/cli.ts --verify-ledger` (exit 1 if broken).

## Operator notes (Session 15)

- `decision: note` is an append-only ledger event. Status of prior usage events is not rewritten.
- Required `note` text, normalized, max 500 characters. Empty notes rejected.
- Zero tokens and cost. Policy id `operator-note`. Default team `ops` / app `admin`.
- Notes are omitted from FinOps cost rows and from spend / budget sums.
- CLI: `--note="text" [--team=id] [--app=id]`. API: `POST /v1/admin/note`. Dashboard has an Add note field.
- Notes are included in the SHA-256 digest.
- Admin summary and CISO pack expose `chainOk` / `chainChecked`.
- Raw prompts remain off the chain body except `requestHash`.


## App rollups (Session 17)

- `summarize()` includes `byApp` keyed by `appId` (`X-Tokenpulse-App`).
- Dashboard renders a By app table next to By team.
- FinOps pack `summary.byApp` comes from the same function. Notes stay out of spend.
- Pilot recording script: `DEMO.md`.


## App budgets (Session 18)

- Optional `apps` map in the budget file (`TOKENPULSE_BUDGETS_PATH`).
- Keys match `X-Tokenpulse-App`. No default app cap from `defaultDailyUsd`.
- Evaluated after team daily and team monthly. Team deny wins.
- App spend is allowed events for that `appId` in the UTC day/month (all teams).
- Denied: HTTP 429 `budget_exceeded` with `scope: app` and policy `budget-daily-app` or `budget-monthly-app`.


## App rate limits (Session 19)

- Optional `apps` map in the rates file (`TOKENPULSE_RATES_PATH`).
- Keys match `X-Tokenpulse-App`. No default app RPM from `defaultRpm`.
- Evaluated after team RPM. Team deny wins.
- App hits are counted across teams for that `appId` in the in-process window.
- Denied: HTTP 429 `rate_limited` with `scope: app` and policy `rate-limited-app`.


## Budget status (Session 21)

- `budgetStatus()` builds rows for every configured team/app daily and monthly cap.
- Each row: spentUsd, capUsd, remainingUsd, ratio, warn, exhausted.
- Warn threshold: `TOKENPULSE_BUDGET_WARN_RATIO` (default 0.8). Exhausted always warns.
- Admin summary exposes `budgets` + `budgetWarns`. Dashboard table lists status.
- Policy blocks remain hard at evaluateBudget; status is operator visibility only.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.


## Rate status (Session 22)

- `rateStatus()` builds rows for every configured team/app RPM cap.
- Each row: used, capRpm, remaining, ratio, windowMs, warn, exhausted.
- Peek-only: does not record a hit. `TOKENPULSE_RATE_WARN_RATIO` (default 0.8).
- Admin summary exposes `rates` + `rateWarns`. Dashboard renders a Rate limits table.
- Hard blocks still happen only in `evaluateRateLimit`.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.
