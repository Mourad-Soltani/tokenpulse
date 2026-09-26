# Tokenpulse – Progress & Handoff Log

## Project Goal

Private AI FinOps + shadow-AI control plane. Meter tokens, attribute spend, enforce budget/data policy at a self-hosted gateway, export audit packs for CFO and CISO. Target: strong product + early traction → $1B+ exit path within ~12 months (AI FinOps / TRiSM adjacency).

## Current Status (Session 25 — 2026-09-24)

> **ACTIVE flagship for daily-builder only.** Aether Forge is CLOSED. Automation prompt points here exclusively.

- [x] Repository created (`Mourad-Soltani/tokenpulse`)
- [x] Bootstrap: README, ARCHITECTURE, ROADMAP, PROGRESS, package.json, tsconfig, gitignore
- [x] Successor to closed Aether Forge daily-builder loop (client handover)
- [x] OpenAI-compatible gateway skeleton (`POST /v1/chat/completions`)
- [x] Mock upstream when `TOKENPULSE_MOCK_UPSTREAM=1`
- [x] Usage ledger JSONL (`data/ledger/<day>.jsonl`) + cost estimate table
- [x] Team/app attribution via `X-Tokenpulse-Team` / `X-Tokenpulse-App`
- [x] Secret-free `npm run demo`
- [x] Tests (`pricing`, `ledger`, `gateway`) + CLI `--summary` / `--export`
- [x] Daily budget check per team (`TOKENPULSE_BUDGETS_PATH` / `TOKENPULSE_DEFAULT_DAILY_USD`)
- [x] HTTP 429 `budget_exceeded` + ledger `decision: block`
- [x] Live upstream forward (`TOKENPULSE_UPSTREAM_*` / `OPENAI_API_KEY` / `XAI_API_KEY`)
- [x] Model allow/deny list (`TOKENPULSE_MODELS_PATH` / `TOKENPULSE_MODEL_ALLOW` / `TOKENPULSE_MODEL_DENY`)
- [x] HTTP 403 `model_denied` + ledger `decision: block`
- [x] Loopback admin API (`GET /v1/admin/summary`, `GET /v1/admin/events`)
- [x] Minimal dashboard (`GET /`, `GET /dashboard`)
- [x] Sensitive-payload heuristics (regex detectors; no raw prompt storage)
- [x] Per-team RPM rate limits (`TOKENPULSE_RATES_PATH` / `TOKENPULSE_DEFAULT_RPM`)
- [x] HTTP 429 `rate_limited` + ledger `decision: block`
- [x] Pilot landing copy (`LANDING.md`)
- [x] Optional SQLite ledger (`TOKENPULSE_LEDGER_DRIVER=sqlite`, Node `node:sqlite`)
- [x] FinOps pack `tokenpulse-finops-v1` + CISO pack `tokenpulse-security-v1` (CLI + admin + dashboard)
- [x] Session 10 — OpenAI-compatible embeddings proxy (`POST /v1/embeddings`)
- [x] Session 11 — per-request size limits (`maxPromptChars` / `max_tokens`; HTTP 413 `limit_exceeded`)
- [x] Embeddings proxy `POST /v1/embeddings` (mock + live forward, same policy path)
- [x] Session 12 — monthly team spend caps (`monthlyUsd` / `TOKENPULSE_DEFAULT_MONTHLY_USD`)
- [x] Session 13 — OpenAI-compatible chat streaming (SSE)
- [x] Session 14 — SHA-256 hash chain on usage events (`prevHash` + `hash`, `--verify-ledger`)
- [x] Session 15 — operator notes (`decision: note`, CLI `--note`, `POST /v1/admin/note`)
- [x] Session 16 — OpenAI-compatible `GET /v1/models` filtered by allow/deny
- [x] Session 17 — spend rollup `byApp` + secret-free `DEMO.md` walkthrough
- [x] Session 18 — per-app daily/monthly spend caps (`apps` in budget file)
- [x] Session 19 — per-app RPM (`apps` in rates file)
- [x] Session 20 — per-app prompt / max_tokens caps (`apps` in limits file)
- [x] Session 21 — budget status on admin summary (spent / remaining / warn)
- [x] Session 22 — rate-limit status on admin summary (used / remaining / warn)
- [x] Session 23 — request-size limit status on admin summary (caps + hard-block warn)
- [x] Session 24 — sale readiness pack (`SALE.md`, `BUYERS.md`, `OUTREACH.md`)
- [x] Session 25 — multi-upstream fallback (`TOKENPULSE_UPSTREAM_FALLBACK_*`)
- [x] Session 26 — model remap (`TOKENPULSE_MODEL_REMAP` / `remap`)
- [x] Session 27 — weighted multi-upstream first hop (`TOKENPULSE_UPSTREAM_WEIGHTS`)

## Next Up (highest priority)

1. **Operator:** live-upstream proof with rotated key outside git/chat; record `DEMO.md` (no keys on camera).
2. After recording exists: personalize ≤10 emails from `OUTREACH.md` using `BUYERS.md`.
3. Optional later product: discovery, weighted multi-upstream / model remap, SSO, cloud single-tenant (`ROADMAP.md`).

## Decisions So Far

- Stack: TypeScript (Node 20+), Zod, Node `http` for gateway.
- Self-host first; loopback default (`127.0.0.1:8788`).
- Raw prompts **not** stored by default. Ledger stores `requestHash` only.
- Distinct from Aether Forge: no workflow orchestrator; focus is gateway + ledger + policy.
- Pricing table is approximate (static map for common models); operators can override via config later.
- No secrets in git. Upstream keys env-only.
- Session 1: live upstream returned 501 until Session 3. Demo still uses mock by default.
- Gateway token optional; if `TOKENPULSE_GATEWAY_TOKEN` is set, require `Authorization: Bearer` or `X-Tokenpulse-Token`. `/health` stays open.
- Streaming rejected in v0.1.
- Session 2: daily USD cap is per team, counted from **allowed** events for UTC day in the ledger. Missing config = unlimited. Team `dailyUsd: 0` hard-blocks. Default file example: `budgets.example.json`. Blocked requests do not increment spend.
- Session 3: mock flag still wins. Else resolve `TOKENPULSE_UPSTREAM_BASE_URL`+`TOKENPULSE_UPSTREAM_API_KEY`, then `XAI_API_KEY` (`https://api.x.ai/v1`), then `OPENAI_API_KEY` (`https://api.openai.com/v1`). Timeout `TOKENPULSE_UPSTREAM_TIMEOUT_MS` (default 20s, cap 60s). Upstream failures ledger `decision: block` + `upstream_error`. No keys in git or chat.
- Session 4: model policy runs after request validation and before budget/upstream. Empty lists = open. Deny wins over allow. Env CSV lists override the matching file field when non-empty. File path `TOKENPULSE_MODELS_PATH` default `data/models.json`. Example committed as `models.example.json`.

- Session 5: admin routes share gateway auth. Dashboard is static HTML in-process (no Next.js yet). Browser talks only to `/v1/admin/*`. No raw prompts on the admin surface.

- Session 6: message text is scanned before model/budget/upstream. Default on (`TOKENPULSE_SENSITIVE=off` disables). Hits ledger as `sensitive-block` plus `sensitive:<category>`. Matched substrings are never persisted.

- Session 8: optional SQLite driver (`TOKENPULSE_LEDGER_DRIVER=sqlite`). Default remains JSONL. Path `TOKENPULSE_SQLITE_PATH` (default `data/ledger.sqlite`). Built-in `node:sqlite`. Same read/append API so budget and admin stay driver-agnostic.
- Session 7: per-team sliding-window RPM. File + env. In-process only. Evaluated after model policy, before budget. `rpm: 0` hard-blocks. Pilot copy lives in `LANDING.md`. No outreach until live-upstream proof.
- Session 9: export packs omit raw prompts. FinOps includes allow+block cost rows. Security includes blocked events, policyHits, requestHash. CSV via `--csv` or `?format=csv`.
- Session 10: `POST /v1/embeddings` shares auth, team headers, sensitive/model/rate/budget, mock + live upstream, and ledger (`endpoint:embeddings`).
- Session 11: request size policy via `TOKENPULSE_LIMITS_PATH` / `TOKENPULSE_MAX_PROMPT_CHARS` / `TOKENPULSE_MAX_TOKENS`. Team overrides. 413 `limit_exceeded`. Runs before sensitive scan. `maxTokens: 0` hard-blocks. Omit `max_tokens` = allowed unless cap is 0.
- Session 10: embeddings share the chat policy path. Mock vectors are deterministic and short. Live uses `/embeddings`. Allow-lists must include embedding model ids.
- Session 12: monthly USD cap per team from allowed events in the UTC month. Daily checked first. `monthlyUsd: 0` hard-blocks. Ledger `readEvents` accepts `month`. Error payload includes `period`.
- Session 13: chat `stream: true` returns SSE; policy still runs before upstream; mock and live both supported.
- Session 14: each appended usage event is SHA-256 chained (`prevHash` + `hash`). `--verify-ledger` exits 1 when broken. Admin summary and security pack include `chainOk`. Legacy events without hash are skipped. Genesis `prevHash` is empty string.
- Session 13: `stream: true` returns SSE. Policies still block as JSON. Ledger appends after stream body is fully written; policyIds include `stream`. Live forwards upstream SSE with include_usage when available.
- Session 15: operators may append a `note` decision. Required normalized text (max 500). Zero tokens / cost. Notes are excluded from spend rollups and FinOps event rows. Empty notes rejected. Notes participate in the hash chain.
- Session 16: `GET /v1/models` (and `/models`) returns an OpenAI-style `{ object: list, data }` catalog. Visibility uses the same allow/deny policy as chat/embeddings. Pricing-table ids are the default catalog; extra allow-list ids are included. Denied models are omitted. Auth matches other gateway routes (`/health` stays open). No ledger write for list.

## Decisions (Session 17)

- `summarize()` exposes `byApp` using `UsageEvent.appId` (same bucket shape as `byTeam` / `byModel`).
- Notes still skip spend buckets.
- FinOps pack inherits `byApp` via the shared summary object.
- `DEMO.md` is the operator recording script. `LANDING.md` stays the one-pager.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.

## Decisions (Session 18)

- Budget file may include `apps` keyed by `appId` (`X-Tokenpulse-App`).
- Team daily/monthly caps still evaluate first. App caps apply only if the team still has room.
- App caps do not inherit team defaults. Missing `apps` entry = no app-level cap.
- `dailyUsd: 0` / `monthlyUsd: 0` on an app hard-blocks that app.
- Policy ids: `budget-daily-app` / `budget-monthly-app`. Error payload includes `scope` (`team` | `app` | `none`) and `app`.
- App spend is summed across teams for that `appId` (same as `byApp` rollup).
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.

## Decisions (Session 19)

- Rates file may include `apps` keyed by `appId`.
- Team RPM is evaluated first. App RPM applies only if the team still has room.
- App RPM does not inherit `defaultRpm`. Missing `apps` entry = no app-level cap.
- `rpm: 0` on an app hard-blocks that app.
- Policy id `rate-limited-app`. Error payload includes `scope` (`team` | `app` | `none`) and `app`.
- App RPM is counted across teams for that `appId` (in-process window).
- Chat-pasted tokens remain unusable for live provider calls. Live upstream stays operator-env only.

## Decisions (Session 20)

- Limits file may include `apps` keyed by `appId`.
- Team size caps evaluate first. App caps apply only if the team still allows.
- App caps do not inherit `defaultMaxPromptChars` / `defaultMaxTokens`. Missing `apps` entry = no app-level cap.
- `maxTokens: 0` on an app hard-blocks that app.
- Policy ids: `limit-prompt-chars-app` / `limit-max-tokens-app`. Error payload includes `scope` and `app`.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.

## Decisions (Session 21)

- `budgetStatus()` lists configured team/app daily and monthly caps with spent, remaining, ratio.
- Warn when `ratio >= TOKENPULSE_BUDGET_WARN_RATIO` (default 0.8) or when exhausted.
- Admin summary includes `budgets` and `budgetWarns`. Dashboard renders a Budgets table.
- Does not change block policy — hard caps still enforce at evaluateBudget time.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.

## Decisions (Session 22)

- `rateStatus()` peeks in-process window hits; it does not consume quota.
- Warn when `ratio >= TOKENPULSE_RATE_WARN_RATIO` (default 0.8) or when exhausted / `rpm: 0`.
- Admin summary includes `rates` and `rateWarns`. Dashboard renders a Rate limits table.
- Does not change block policy — hard caps still enforce at evaluateRateLimit time.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.

## Decisions (Session 23)

- `limitStatus()` lists configured default / team / app prompt-char and max_tokens caps.
- Per-request policy has no running usage window. Warn + exhausted when `max_tokens` cap is `0`.
- Admin summary includes `limits` and `limitWarns`. Dashboard renders a Request size limits table.
- Does not change block policy — hard caps still enforce at evaluateLimits time.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.

## Handoff for next session

**Active project:** Tokenpulse only. Daily automation: Tokenpulse Daily Builder (08:00 Europe/Berlin).
Session 23 ships request-size cap visibility on admin summary and dashboard. Live upstream proof still needs a rotated provider key supplied outside chat. Never paste provider keys or GitHub PATs into chat.

```bash
npm install
npm test
npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# open http://127.0.0.1:8788/ and paste the token
```

## Decisions (Session 24 — sale packaging)

- Product MVP remains Session 23 scope. No new gateway features required for sale readiness.
- Added `SALE.md` (positioning, checklist, valuation posture), `BUYERS.md` (Tier A–C map), `OUTREACH.md` (non-bulk sequences + objections).
- Outbound email still gated on operator-recorded live proof + DEMO.md video.
- Portkey → Palo Alto purchase consideration ~$117M (SEC) is a category signal, not a Tokenpulse mark.
- Pitch adjacent value (self-host FinOps/policy/audit), never “replace Portkey.”

## Current Status (Session 24 — 2026-09-24)

Sale materials complete. Product unchanged from Session 23.

- [x] Session 24 — sale readiness pack (`SALE.md`, `BUYERS.md`, `OUTREACH.md`)

## Next Up (highest priority)

1. **Operator:** live-upstream proof with rotated key outside git/chat; record `DEMO.md` (no keys on camera).
2. After recording exists: personalize ≤10 emails from `OUTREACH.md` using `BUYERS.md`.
3. Optional later product: discovery, multi-upstream, SSO mapping, cloud single-tenant (see `ROADMAP.md`).

## Handoff for next session

**Active project:** Tokenpulse only.
Session 24 completes sale packaging. Automation cannot record the live demo — that is the only hard gate before outreach.
Never paste provider keys or GitHub PATs into chat.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
```

## Decisions (Session 25 — multi-upstream fallback)

- Optional fallback hop via `TOKENPULSE_UPSTREAM_FALLBACK_BASE_URL` + `TOKENPULSE_UPSTREAM_FALLBACK_API_KEY`.
- Primary resolve order is unchanged. Duplicate baseUrl+key pairs are dropped.
- Chat, embeddings, and SSE try the next hop only if the current hop throws before the client body starts.
- Ledger: `upstream:<source>` plus `upstream-fallback` when the used hop is not first.
- `/health` reports `upstreams` count. Mock still wins when `TOKENPULSE_MOCK_UPSTREAM=1`.
- Live-upstream demo recording remains an operator gate. No keys in git or chat.

## Current Status (Session 25 — 2026-09-24)

Fallback hop shipped. Sale materials unchanged. Operator live proof still required before outreach.

## Next Up (highest priority)

1. **Operator:** live-upstream proof with rotated key outside git/chat; record `DEMO.md` (no keys on camera).
2. After recording exists: personalize ≤10 emails from `OUTREACH.md` using `BUYERS.md`.
3. Optional later product: discovery, weighted routing / model remap, SSO, cloud single-tenant (`ROADMAP.md`).

## Handoff for next session

**Active project:** Tokenpulse only.
Session 25 adds provider fallback. Automation still cannot record the live demo — that remains the hard gate before outreach.
Never paste provider keys or GitHub PATs into chat.

## Decisions (Session 26 — model remap)

- Models file may include `remap` keyed by client model id.
- Env `TOKENPULSE_MODEL_REMAP=from:to,from2:to2` replaces the file map when non-empty.
- Allow/deny evaluate the client model. Remap applies only after allow.
- Mock, live, embeddings, and SSE send the remapped id. Ledger `model` stays client-facing.
- Policy ids: `model-remap` + `remap:<from>:<to>`. Identity maps are ignored.
- Live-upstream demo recording remains an operator gate. No keys in git or chat.

## Current Status (Session 26 — 2026-09-25)

Model remap shipped. Sale materials unchanged. Operator live proof still required before outreach.

## Next Up (highest priority)

1. **Operator:** live-upstream proof with rotated key outside git/chat; record `DEMO.md` (no keys on camera).
2. After recording exists: personalize ≤10 emails from `OUTREACH.md` using `BUYERS.md`.
3. Optional later product: discovery, weighted routing, SSO, cloud single-tenant (`ROADMAP.md`).

## Handoff for next session

**Active project:** Tokenpulse only.
Session 26 adds client→upstream model remap. Automation still cannot record the live demo — that remains the hard gate before outreach.
Never paste provider keys or GitHub PATs into chat.


## Decisions (Session 27 — weighted routing)

- `TOKENPULSE_UPSTREAM_WEIGHTS=source:weight` picks the first hop; other hops remain fallback order.
- Weight `0` excludes a source from being first. Unlisted sources default to weight 1 when any weights exist.
- `TOKENPULSE_ROUTE_SEED` seeds a mulberry32 RNG for deterministic tests.
- Does not change mock-first or live-key rules. No keys in git or chat.
- Live-upstream demo recording remains an operator gate.

## Current Status (Session 27 — 2026-09-26)

Weighted first-hop routing shipped. Sale materials unchanged. Operator live proof still required before outreach.

## Next Up (highest priority)

1. **Operator:** live-upstream proof with rotated key outside git/chat; record `DEMO.md` (no keys on camera).
2. After recording exists: personalize ≤10 emails from `OUTREACH.md` using `BUYERS.md`.
3. Optional later product: discovery, SSO, cloud single-tenant (`ROADMAP.md`).

## Handoff for next session

**Active project:** Tokenpulse only.
Session 27 adds weighted first-hop among the upstream chain. Automation still cannot record the live demo — that remains the hard gate before outreach.
Never paste provider keys or GitHub PATs into chat.
