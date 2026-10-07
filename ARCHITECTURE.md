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
6. On allow → mock when `TOKENPULSE_MOCK_UPSTREAM=1`; else live forward via `resolveUpstreamChain()`. Meter provider `usage`, append ledger, return body. Missing live config → 501. Upstream errors → try fallback then ledger `block` + `upstream_error`.

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

## Model remap (Session 26)

- Optional `remap` map in the models file (`TOKENPULSE_MODELS_PATH`) and/or `TOKENPULSE_MODEL_REMAP=from:to,from2:to2`.
- Env remap replaces the file map when non-empty.
- Allow/deny still evaluate the **client** model id. Remap runs only after allow.
- Chat, embeddings, mock, live, and SSE send the remapped id upstream.
- Ledger `model` stays the client id. Policy ids: `model-remap` + `remap:<from>:<to>`.
- `GET /v1/models` lists client-facing ids only.
- Identity maps (`from` equals `to`) are ignored.

## Multi-upstream fallback (Session 25)

- Primary resolve is unchanged (`TOKENPULSE_UPSTREAM_*` then xAI then OpenAI).
- Optional second hop: `TOKENPULSE_UPSTREAM_FALLBACK_BASE_URL` + `TOKENPULSE_UPSTREAM_FALLBACK_API_KEY`.
- Identical baseUrl+key pairs are dropped. Empty chain still 501.
- Chat, embeddings, and streaming try the next hop only when the current hop throws before the client body starts.
- Success ledger ids: `upstream:<source>` and `upstream-fallback` when the used hop is not the first.
- Failures after the last hop remain `upstream_error` (no partial prompt storage).

## Limit status (Session 23)

- `limitStatus()` lists default, team, and app prompt-char / max_tokens caps.
- Rows: scope, id, kind, cap, warn, exhausted.
- Exhausted/warn when `max_tokens` is `0` (hard block). Other listed caps are ok.
- Admin summary exposes `limits` + `limitWarns`. Dashboard renders a Request size limits table.
- Hard blocks still happen only in `evaluateLimits`.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.


## Weighted routing (Session 27)

- Optional `TOKENPULSE_UPSTREAM_WEIGHTS=source:weight,...` reorders the resolved chain.
- First hop is sampled by weight; remaining hops stay original order for fallback.
- Sources with weight `0` are never chosen first.
- `TOKENPULSE_ROUTE_SEED` makes the pick deterministic (tests / replay).
- Missing weights = current primary-then-fallback order.
- `/health` reports `weighted` when the env is set.


## Upstream status (Session 28)

- `upstreamStatus()` lists configured hops as source + host + weight + firstEligible.
- Order is the configured (pre-sample) chain so the dashboard does not jitter.
- API keys never appear on `/v1/admin/summary` or the dashboard.
- Admin summary exposes `upstreams`. Dashboard renders an Upstreams table.
- Does not change routing — Session 27 still samples first hop at request time.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.


## Model policy status (Session 29)

- `modelStatus()` lists mode, allow, deny, remaps, and visible catalog count.
- Admin summary exposes `models`. Dashboard renders a Models table.
- Does not change allow/deny/remap evaluation.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.


## Pricing catalog status (Session 33)

- `pricingStatus()` lists static USD-per-1M catalog rows plus the unknown-model fallback.
- Admin summary exposes `pricing`. Dashboard renders a Pricing catalog table.
- Does not change `estimateCostUsd` / `priceFor`.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.

## Sensitive status (Session 31)

- `sensitiveStatus()` reports mode (`on` | `off`), builtin categories, and extra pattern count.
- Extra pattern *text* is never serialized — only a count of valid `TOKENPULSE_SENSITIVE_EXTRA` entries.
- Admin summary exposes `sensitive`. Dashboard renders a Sensitive payload table.
- Does not change scan or block behavior.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.


## Gateway runtime status (Session 34)

- `gatewayStatus()` reports bind host/port, loopback, mockUpstream, authRequired.
- Admin summary exposes `gateway`. Dashboard renders a Gateway table.
- The gateway token itself is never serialized.
- Does not change listen/auth behavior.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.


## Export pack status (Session 35)

- `exportStatus()` reports FinOps and CISO pack versions, formats (`json` | `csv`), and that raw prompts are never included.
- Admin summary exposes `exports`. Dashboard renders an Export packs table.
- Does not change pack contents or download routes.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.



## Policy pipeline status (Session 36)

- `policyPipelineStatus()` lists post-auth stages: limits → sensitive → model → remap → rate → budget → upstream.
- Admin summary exposes `policy`. Dashboard renders a Policy pipeline table.
- Does not change evaluation or deny HTTP codes.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.


## Attribution status (Session 37)

- `attributionStatus()` lists `X-Tokenpulse-Team` / `X-Tokenpulse-App` → `teamId` / `appId`.
- Missing headers default to `default`. Neither header is required.
- Admin summary exposes `attribution`. Dashboard renders an Attribution table.
- Does not change header parsing or cap evaluation.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.


## Pilot demo deploy (Session 38)

- `Dockerfile` + `compose.pilot.yaml` bind `0.0.0.0:8788` with mock upstream.
- Gateway token is required at runtime. Image does not bake a secret.
- Example policy files are copied in. Ledger writes to a volume.
- Public prospect demos stay mock-only. Live keys stay in the customer VPC (`PILOT.md`).
- Chat-pasted tokens remain unusable. No keys in git.


## Railway / platform bind (Session 39)

- `listenPort()` uses `TOKENPULSE_GATEWAY_PORT`, else platform `PORT`, else 8788.
- `listenHost()` uses explicit host; if only `PORT` is set, binds `0.0.0.0`.
- `railway.toml` builds from `Dockerfile` and health-checks `GET /health`.
- Prospect Railway instance stays mock-only. Token is a Railway variable, never git.


## Request correlation (Session 40)

- Every response echoes `X-Tokenpulse-Request-Id`.
- Client id is accepted when it matches `^[A-Za-z0-9][A-Za-z0-9._:-]{7,63}$`. Otherwise the gateway generates `tp_` + 32 hex chars.
- Ledger field `requestId` is written on usage events (JSONL and SQLite).
- The id is **not** part of the SHA-256 chain body, so existing hashes still verify.
- Security pack JSON/CSV include `requestId` on blocked rows. Raw prompts stay off.
- Admin summary exposes `correlation`. Dashboard renders a Correlation table. Live ids are not listed there.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.


## Request id lookup (Session 41)

- `GET /v1/admin/events?requestId=` returns exact ledger matches (optional `day`, `decision`, `limit`).
- Invalid ids (not 8–64 chars of `[A-Za-z0-9._:-]`) are HTTP 400 `invalid_request_id`.
- CLI: `--request-id=` prints `{ requestId, count, events }`. No raw prompts.
- Dashboard Correlation card has a Lookup field. Same admin auth as other `/v1/admin/*` routes.
- Does not change hash chain membership. `requestId` stays out of the digest.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.


## Client keys (Session 42)

- File: `TOKENPULSE_KEYS_PATH` (default `data/keys.json`). Example: `keys.example.json` (disabled placeholder only).
- Each entry stores `tokenSha256` (hex SHA-256 of the bearer), `id`, `teamId`, `appId`. Optional `disabled`.
- Plaintext tokens and digests are never returned on admin or dashboard.
- Gateway token still wins when it matches (operator path; headers apply).
- Otherwise a matching enabled key binds `teamId` / `appId`. `X-Tokenpulse-Team` and `X-Tokenpulse-App` cannot override.
- Ledger policy id `key:<id>` (included in the hash chain). Notes from a key use the bound team/app.
- No gateway token and no enabled keys = open, same as before. Health stays open. `authRequired` is true if either a gateway token or an enabled key is configured.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.


## Client key issuance (Session 43)

- CLI: `npx tsx src/cli.ts --issue-key --id= --team= --app=`.
- Generates a 24-byte base64url bearer when none is supplied to `issueClientKey`.
- Writes only `tokenSha256` into `TOKENPULSE_KEYS_PATH`. Plaintext is printed once on stdout and is not stored.
- Duplicate ids are rejected. Invalid keys files are not overwritten.
- Issued keys follow Session 42 match rules (headers cannot override).
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.

## Client key revoke (Session 44)

- CLI: `npx tsx src/cli.ts --revoke-key --id=`. `--list-keys` prints id/team/app/disabled only.
- Sets `disabled: true` on the matching row. The SHA-256 digest is not deleted and not rewritten.
- Revoke is idempotent (`alreadyDisabled`). Unknown ids and invalid key files are rejected.
- Disabled keys no longer match. Dashboard status already lists `disabled`.
- Digests and bearer tokens are never printed by list or revoke.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.


## Client key re-enable (Session 45)

- CLI: `npx tsx src/cli.ts --enable-key --id=` (also `npm run enable-key -- --id=`).
- Clears `disabled` on the matching row (`disabled: false`). SHA-256 digest is not rewritten and no new bearer is minted.
- Idempotent when the key is already enabled (`alreadyEnabled`). Unknown ids and invalid key files are rejected.
- Restored keys follow Session 42 match rules (headers cannot override).
- Digests and bearer tokens are never printed by enable.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.

## Client key expiry (Session 46)

- Optional `expiresAt` on a key row. CLI: `--issue-key --id= --team= --app= --expires=YYYY-MM-DD` (or full ISO).
- Date-only values are stored as end of that UTC day (`T23:59:59.999Z`) so the calendar day is inclusive.
- Expired keys do not match. They still count as configured auth until `disabled`, so a stale bearer cannot fall through to an open gateway.
- Admin summary and dashboard show `expired` and `expiresAt`. Digests stay off the status payload.
- Does not mint a new bearer and does not rewrite an existing digest. Revoke and re-enable are unchanged.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.
