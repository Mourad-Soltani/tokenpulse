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
- [x] Session 28 — upstream route status on admin/dashboard
- [x] Session 29 — model policy status on admin/dashboard
- [x] Session 30 — diligence proof pack + pilot/reference path
- [x] Session 31 — sensitive scan status on admin/dashboard
- [x] Session 32 — ledger / chain status on admin/dashboard
- [x] Session 33 — pricing catalog status on admin/dashboard
- [x] Session 34 — gateway runtime status on admin/dashboard

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


## Decisions (Session 28 — upstream status)

- `upstreamStatus()` reports mock, liveConfigured, weighted, and hops (source, host, weight, firstEligible).
- Uses configured order, not the per-request weighted sample, so the dashboard is stable.
- Keys are never serialized. Host is parsed from baseUrl only.
- Admin summary includes `upstreams`. Dashboard adds an Upstreams table.
- Routing behavior is unchanged from Session 27.
- Live-upstream demo recording remains an operator gate. No keys in git or chat.

## Current Status (Session 28 — 2026-09-26)

Upstream visibility shipped. Sale materials unchanged. Operator live proof still required before outreach.

## Next Up (highest priority)

1. **Operator:** live-upstream proof with rotated key outside git/chat; record `DEMO.md` (no keys on camera).
2. After recording exists: personalize ≤10 emails from `OUTREACH.md` using `BUYERS.md`.
3. Optional later product: discovery, SSO, cloud single-tenant (`ROADMAP.md`).

## Handoff for next session

**Active project:** Tokenpulse only.
Session 28 adds key-free upstream hop status on admin summary and dashboard.
Automation still cannot record the live demo — that remains the hard gate before outreach.
Never paste provider keys or GitHub PATs into chat.


## Decisions (Session 29 — model policy status)

- `modelStatus()` reports mode (`open` | `allowlist` | `deny-only` | `allow+deny`), allow/deny ids, remaps, and visible catalog count.
- Identity remaps are omitted. Keys never appear.
- Admin summary includes `models`. Dashboard adds a Models table.
- Does not change allow/deny/remap evaluation.
- Live-upstream demo recording remains an operator gate. No keys in git or chat.

## Current Status (Session 29 — 2026-09-27)

Model policy visibility shipped. Sale materials unchanged. Operator live proof still required before outreach.

## Next Up (highest priority)

1. **Operator:** live-upstream proof with rotated key outside git/chat; record `DEMO.md` (no keys on camera).
2. After recording exists: personalize ≤10 emails from `OUTREACH.md` using `BUYERS.md`.
3. Optional later product: discovery, SSO, cloud single-tenant (`ROADMAP.md`).

## Handoff for next session

**Active project:** Tokenpulse only.
Session 29 adds key-free model allow/deny/remap status on admin summary and dashboard.
Automation still cannot record the live demo — that remains the hard gate before outreach.
Never paste provider keys or GitHub PATs into chat.


## Decisions (Session 30 — close proof + reference path)

- Machine-verifiable diligence artifacts live under `proof/` (FinOps, security, chain, summary) from secret-free demo.
- `PROOF.md` is the buyer-facing reproduction + operator recording checklist.
- `PILOT.md` defines the $15k/30d pilot offer and how a real reference is captured; References table stays empty until a signed pilot quote exists.
- Does not invent customers or claim a screen recording that does not exist.
- Operator local recording remains the only human gate before outbound email.
- No keys in git or chat.

## Current Status (Session 30 — 2026-09-27)

Diligence proof pack + pilot path shipped. Operator screen recording and first pilot still open.

## Next Up (highest priority)

1. **Operator:** screen-record `PROOF.md` section B / `DEMO.md` (no keys on camera).
2. Start personalized emails (`OUTREACH.md`) or first pilot conversation (`PILOT.md`).
3. After first pilot quote: fill References in `PILOT.md`.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 30 closes the in-repo side of live proof (sample packs + checklist) and the process side of commercial references (pilot offer). Camera recording and real counterparties remain human.
Never paste provider keys or GitHub PATs into chat.


## Decisions (Session 31 — sensitive status)

- `sensitiveStatus()` reports enabled/mode, builtin categories (`secret`, `pii`), and extraPatterns count.
- Custom regex text from `TOKENPULSE_SENSITIVE_EXTRA` is never returned on admin or dashboard.
- Admin summary includes `sensitive`. Dashboard adds a Sensitive payload table.
- Scan/block behavior is unchanged from Session 6.
- Live-upstream demo recording remains an operator gate. No keys in git or chat.

## Current Status (Session 31 — 2026-09-27)

Sensitive scan visibility shipped. Sale materials unchanged. Operator live proof still required before outreach.

## Next Up (highest priority)

1. **Operator:** screen-record `PROOF.md` section B / `DEMO.md` (no keys on camera).
2. Start personalized emails (`OUTREACH.md`) or first pilot conversation (`PILOT.md`).
3. After first pilot quote: fill References in `PILOT.md`.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 31 adds key-free sensitive-scan status on admin summary and dashboard.
Automation still cannot record the live demo — that remains the hard gate before outreach.
Never paste provider keys or GitHub PATs into chat.

## Decisions (Session 32 — ledger status)

- `ledgerStatus()` reports driver (`jsonl` | `sqlite`), event count, chainOk / checked / skippedLegacy, optional `brokenAt` id, and 8-char `tipHashPrefix`.
- Full hashes and filesystem paths are never returned on admin or dashboard.
- Admin summary includes `ledger`. Dashboard adds a Ledger table and keeps the Chain KPI.
- Append / verify behavior is unchanged from Sessions 8 and 14.
- Live-upstream demo recording remains an operator gate. No keys in git or chat.

## Current Status (Session 32 — 2026-09-28)

Ledger / hash-chain visibility shipped. Sale materials unchanged. Operator live proof still required before outreach.

## Next Up (highest priority)

1. **Operator:** screen-record `PROOF.md` section B / `DEMO.md` (no keys on camera).
2. Start personalized emails (`OUTREACH.md`) or first pilot conversation (`PILOT.md`).
3. After first pilot quote: fill References in `PILOT.md`.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 32 adds key-free ledger driver + hash-chain status on admin summary and dashboard (and fixes nested dashboard markup from Session 31).
Automation still cannot record the live demo — that remains the hard gate before outreach.
Never paste provider keys or GitHub PATs into chat.


## Decisions (Session 33 — pricing status)

- `pricingStatus()` reports unit (`usd_per_million_tokens`), catalogCount, fallback rates, and per-model input/output rows.
- Admin summary includes `pricing`. Dashboard adds a Pricing catalog table and a Priced models KPI.
- Does not change cost estimates. Unknown models still use the $1/$3 per 1M fallback.
- Live-upstream demo recording remains an operator gate. No keys in git or chat.

## Current Status (Session 33 — 2026-09-28)

Pricing catalog visibility shipped. Sale materials unchanged. Operator live proof still required before outreach.

## Next Up (highest priority)

1. **Operator:** screen-record `PROOF.md` section B / `DEMO.md` (no keys on camera).
2. Start personalized emails (`OUTREACH.md`) or first pilot conversation (`PILOT.md`).
3. After first pilot quote: fill References in `PILOT.md`.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 33 adds key-free pricing-catalog status on admin summary and dashboard.
Automation still cannot record the live demo — that remains the hard gate before outreach.
Never paste provider keys or GitHub PATs into chat.

## Decisions (Session 34 — gateway runtime status)

- `gatewayStatus()` reports host, port, loopback, mockUpstream, and authRequired from env.
- Default bind remains `127.0.0.1:8788`. Invalid port falls back to 8788.
- Admin summary includes `gateway`. Dashboard adds a Gateway table and a Bind KPI.
- The gateway token value is never returned.
- Does not change listen or auth behavior.
- Live-upstream demo recording remains an operator gate. No keys in git or chat.

## Current Status (Session 34 — 2026-09-29)

Gateway runtime visibility shipped. Sale materials unchanged. Operator live proof still required before outreach.

- [x] Session 34 — gateway runtime status on admin/dashboard

## Next Up (highest priority)

1. **Operator:** screen-record `PROOF.md` section B / `DEMO.md` (no keys on camera).
2. Start personalized emails (`OUTREACH.md`) or first pilot conversation (`PILOT.md`).
3. After first pilot quote: fill References in `PILOT.md`.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 34 adds key-free gateway bind + auth flags on admin summary and dashboard.
Automation still cannot record the live demo — that remains the hard gate before outreach.
Never paste provider keys or GitHub PATs into chat.


## Decisions (Session 35 — export pack status)

- `exportStatus()` reports FinOps/CISO versions, `json`+`csv` formats, and `includesRawPrompts: false`.
- Admin summary includes `exports`. Dashboard adds an Export packs table and an Exports KPI.
- Does not change pack generation. Notes stay omitted from FinOps event rows.
- Live-upstream demo recording remains an operator gate. No keys in git or chat.

## Current Status (Session 35 — 2026-09-29)

Export pack visibility shipped. Sale materials unchanged. Operator live proof still required before outreach.

- [x] Session 35 — export pack status on admin/dashboard
- [x] Session 36 — policy pipeline status on admin/dashboard

## Next Up (highest priority)

1. **Operator:** screen-record `PROOF.md` section B / `DEMO.md` (no keys on camera).
2. Start personalized emails (`OUTREACH.md`) or first pilot conversation (`PILOT.md`).
3. After first pilot quote: fill References in `PILOT.md`.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 35 adds key-free export-pack versions and formats on admin summary and dashboard.
Automation still cannot record the live demo — that remains the hard gate before outreach.
Never paste provider keys or GitHub PATs into chat.


## Decisions (Session 36 — policy pipeline status)

- `policyPipelineStatus()` lists the seven post-auth evaluation stages in order.
- Admin summary includes `policy`. Dashboard adds a Policy pipeline table and a Policy stages KPI.
- Does not change evaluate order or deny codes.
- Live-upstream demo recording remains an operator gate. No keys in git or chat.

## Current Status (Session 36 — 2026-09-30)

Policy pipeline visibility shipped. Sale materials unchanged. Operator live proof still required before outreach.

- [x] Session 36 — policy pipeline status on admin/dashboard

## Next Up (highest priority)

1. **Operator:** screen-record `PROOF.md` section B / `DEMO.md` (no keys on camera).
2. Start personalized emails (`OUTREACH.md`) or first pilot conversation (`PILOT.md`).
3. After first pilot quote: fill References in `PILOT.md`.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 36 adds the ordered policy stages on admin summary and dashboard.
Automation still cannot record the live demo — that remains the hard gate before outreach.
Never paste provider keys or GitHub PATs into chat.


## Decisions (Session 37 — attribution status)

- `attributionStatus()` lists team/app request headers mapped to ledger fields.
- Missing headers default to `default`. Headers are optional.
- Admin summary includes `attribution`. Dashboard adds an Attribution table and an Attr fields KPI.
- Does not change header parsing or team/app cap evaluation.
- Live-upstream demo recording remains an operator gate. No keys in git or chat.

## Current Status (Session 37 — 2026-10-01)

Attribution header visibility shipped. Sale materials unchanged. Operator live proof still required before outreach.

- [x] Session 37 — attribution header status on admin/dashboard

## Next Up (highest priority)

1. **Operator:** screen-record `PROOF.md` section B / `DEMO.md` (no keys on camera).
2. Start personalized emails (`OUTREACH.md`) or first pilot conversation (`PILOT.md`).
3. After first pilot quote: fill References in `PILOT.md`.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 37 adds key-free team/app header attribution on admin summary and dashboard.
Automation still cannot record the live demo — that remains the hard gate before outreach.
Never paste provider keys or GitHub PATs into chat.


## Decisions (Session 38 — pilot demo deploy)

- Added containerized mock demo: `Dockerfile`, `compose.pilot.yaml`, `DEPLOY.md`.
- Bind `0.0.0.0` only inside the container; token required; mock upstream on.
- This is a prospect walkthrough host, not a signed paid pilot and not live provider traffic.
- Live-upstream recording and first paid `PILOT.md` counterparty remain operator gates.
- No keys in git or chat.

## Current Status (Session 38 — 2026-10-01)

Pilot demo deploy pack shipped. Sale materials unchanged. Operator still must stand the container up on a host they control and record the walkthrough.

- [x] Session 38 — Docker pilot demo (mock-first)

## Next Up (highest priority)

1. **Operator:** `docker compose -f compose.pilot.yaml up --build -d` on a VM you control; put TLS in front; record `DEMO.md` against that URL (no keys on camera).
2. Start personalized emails (`OUTREACH.md`) or first paid conversation (`PILOT.md`).
3. After first pilot quote: fill References in `PILOT.md`.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 38 adds a mock-first container demo. Automation cannot provision your public VM or TLS cert.
Never paste provider keys or GitHub PATs into chat.


## Decisions (Session 39 — Railway demo bind)

- Gateway honors platform `PORT` so Railway/Fly public routing works.
- `railway.toml` uses Dockerfile builder + `/health`.
- This session does **not** create a Railway project: no account token in this environment, and tokens must not be pasted into chat.
- Operator completes deploy in the Railway dashboard (GitHub repo + variables).
- Mock-only on the public demo. No provider keys.

## Current Status (Session 39 — 2026-10-01)

Railway config + PORT bind shipped. Public URL exists only after the operator connects the GitHub repo in Railway.

- [x] Session 39 — railway.toml + platform PORT bind

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Automation cannot log into Railway. Do not paste Railway or provider tokens into chat.


## Decisions (Session 40 — request correlation)

- Responses echo `X-Tokenpulse-Request-Id`. Safe client ids (8–64 chars, `[A-Za-z0-9._:-]`) are kept; otherwise the gateway generates `tp_` + 32 hex.
- Ledger stores `requestId` (JSONL + SQLite column `request_id`).
- `requestId` is excluded from the SHA-256 chain body so Session 14 hashes remain valid.
- Security pack JSON and CSV include `requestId` on blocked rows. No raw prompts.
- Admin summary exposes `correlation`. Dashboard adds a Correlation table (contract only, not live ids).
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 40 — 2026-10-02)

Request correlation shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 40 — request correlation id on responses, ledger, and CISO pack

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Correlation id is visible in response headers during the recording.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 40 adds audit correlation ids. Automation cannot log into Railway. Do not paste Railway or provider tokens into chat.

## Decisions (Session 41 — request id lookup)

- Admin events accept `requestId` (exact match). Optional `day` narrows the scan. `decision` may be allow, block, or note.
- Ids that fail the Session 40 charset return HTTP 400 `invalid_request_id`.
- CLI `--request-id=` prints matching events. Dashboard Correlation card looks up the same route.
- Response includes `count`. Raw prompts stay off. Hash chain unchanged.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 41 — 2026-10-03)

Request-id audit lookup shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 41 — request id lookup on admin events, CLI, and dashboard

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Correlation id lookup is available during the recording.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 41 makes correlation ids queryable. Automation cannot log into Railway. Do not paste Railway or provider tokens into chat.



## Decisions (Session 42 — client key binding)

- `TOKENPULSE_KEYS_PATH` (default `data/keys.json`) maps bearer SHA-256 digests to `teamId` / `appId`.
- Example file `keys.example.json` is a disabled placeholder. Digests and tokens never appear on admin or dashboard.
- Gateway token match remains the operator path and still honors attribution headers.
- A matching enabled key ignores `X-Tokenpulse-Team` / `X-Tokenpulse-App`. Policy id `key:<id>` is chained.
- Missing file = no keys. No gateway token and no enabled keys stays open. `/health` stays open; `authRequired` is true if either control is set.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 42 — 2026-10-04)

Client key binding shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 42 — hashed client keys bind team/app and cannot be header-spoofed

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Optional: show a client key binding with the digest file mounted locally, never the secret.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 42 adds non-spoofable client attribution. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.


## Decisions (Session 43 — client key issuance)

- `issueClientKey()` appends a SHA-256 digest to `TOKENPULSE_KEYS_PATH` and returns the bearer once.
- CLI: `--issue-key --id= --team= --app=`. Stderr warns to store the token; stdout JSON includes it once.
- Duplicate ids rejected. Invalid keys files are not overwritten. Missing file is created mode 0600.
- Does not change match rules from Session 42. Digests still never appear on admin or dashboard.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 43 — 2026-10-04)

Digest-only key issuance shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 43 — issue client keys without storing plaintext

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Optional local: `npm run issue-key -- --id=finance-bot --team=finance --app=bot` and mount the digest file; never show the printed token.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 43 adds digest-only key issuance. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

## Decisions (Session 44 — client key revoke)

- `--revoke-key --id=` sets `disabled: true` and leaves the SHA-256 digest in place.
- `--list-keys` prints id, team, app, and disabled only. No digest, no bearer.
- Unknown ids are rejected. Invalid keys files are not overwritten. Second revoke is `alreadyDisabled`.
- Does not change Session 42 match rules or Session 43 issuance. Dashboard already shows disabled rows.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 44 — 2026-10-05)

Digest-preserving revoke shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 44 — revoke client keys without deleting the digest

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Optional local: `npm run issue-key -- --id=finance-bot --team=finance --app=bot` then `npm run revoke-key -- --id=finance-bot`; never show the printed token.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 44 adds digest-preserving key revoke and a secret-free key list. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

## Decisions (Session 45 — client key re-enable)

- `--enable-key --id=` sets `disabled: false` and leaves the SHA-256 digest unchanged.
- No new bearer is minted. Operators must still hold the original token from issuance.
- Unknown ids are rejected. Invalid keys files are not overwritten. Second enable is `alreadyEnabled`.
- Does not change Session 42 match rules, Session 43 issuance, or Session 44 revoke.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 45 — 2026-10-06)

Digest-preserving key re-enable shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 45 — re-enable client keys without minting a new secret

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Optional local: `npm run issue-key -- --id=finance-bot --team=finance --app=bot`, `npm run revoke-key -- --id=finance-bot`, then `npm run enable-key -- --id=finance-bot`; never show the printed token.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 45 adds digest-preserving key re-enable. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

## Decisions (Session 46 — client key expiry)

- Optional `expiresAt` on issue (`--expires=YYYY-MM-DD` or ISO). Date-only is inclusive through end of that UTC day.
- Expired keys do not match. Non-disabled expired rows still set `authRequired` so the gateway does not fall open.
- Status adds `expired`, `expiresAt`, and `expiredCount`. Digests stay off admin and dashboard.
- Does not change revoke, re-enable, or digest-only issuance. No new bearer on expiry.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 46 — 2026-10-07)

Optional client-key expiry shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 46 — optional client key expiry (fail closed, digest unchanged)

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Optional local: `npm run issue-key -- --id=finance-bot --team=finance --app=bot --expires=2026-12-31`; never show the printed token.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 46 adds optional client-key expiry. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.


## Decisions (Session 47 — client key rotate)

- CLI: `--rotate-key --id=` (also `npm run rotate-key -- --id=`).
- Replaces the SHA-256 digest for that id. Team, app, and `expiresAt` stay. No second row.
- Clears `disabled` so the new bearer can match. Previous bearer no longer matches.
- Plaintext is printed once and is not stored. Status still omits digests.
- Unknown ids, short tokens, and invalid key files are rejected.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 47 — 2026-10-08)

Digest-replacing key rotate shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 47 — rotate client keys without changing id, team, app, or expiry

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Optional local: `npm run rotate-key -- --id=finance-bot`; never show the printed token.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 47 adds digest-replacing key rotate. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.


## Decisions (Session 48 — client key last-seen)

- `keyStatus(events)` counts events with policy id `key:<id>`.
- Rows add `calls` and `lastSeenAt`. Empty window is 0 / null.
- Admin summary passes the same event set used for spend (optional day filter).
- Dashboard Client keys table shows Calls and Last seen.
- Digests and bearers stay off the status payload. Match, rotate, and expiry are unchanged.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 48 — 2026-10-08)

Client-key last-seen shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 48 — last-seen and call counts on client key status from ledger policy ids

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Key last-seen appears on the Client keys table after traffic.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 48 adds ledger-derived last-seen on client keys. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.


## Decisions (Session 49 — client key idle warn)

- `keyStatus()` sets `idle` on matchable keys with no calls or `lastSeenAt` older than `TOKENPULSE_KEY_IDLE_DAYS` (default 30).
- `TOKENPULSE_KEY_IDLE_DAYS=0` disables idle warnings. Disabled and expired keys are never idle.
- Status adds `idleDays` and `idleWarnCount`. Dashboard Client keys table adds an Idle column.
- Does not change match, rotate, revoke, or expiry. Digests and bearers stay off the payload.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 49 — 2026-10-09)

Client-key idle warn shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 49 — idle / unused warn on client key status from last-seen

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Idle keys show on the Client keys table after traffic (or with no calls).
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 49 adds idle warnings on client keys. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.


## Decisions (Session 50 — client key expiry warn)

- `keyStatus()` sets `expiringSoon` on matchable keys whose `expiresAt` is within `TOKENPULSE_KEY_EXPIRY_WARN_DAYS` (default 7).
- `TOKENPULSE_KEY_EXPIRY_WARN_DAYS=0` disables expiry warnings. Disabled and already-expired keys are never expiring-soon.
- Status adds `expiryWarnDays` and `expiryWarnCount`. Dashboard Client keys table adds an Expiring column.
- Does not change match, rotate, revoke, or expiry. Digests and bearers stay off the payload.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 50 — 2026-10-09)

Client-key expiry warn shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 50 — expiry-soon warn on client key status

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Expiring keys show on the Client keys table.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 50 adds expiry-soon warnings on client keys. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.


## Decisions (Session 51 — shadow discovery)

- `discoveryStatus()` scans the supplied ledger events for models not present in the static pricing catalog.
- Known = exact key or trailing segment after `/` in `PRICING_TABLE`.
- Rows: model, calls, lastSeenAt, teams, apps. Notes skipped. No raw prompts.
- Admin summary includes `discovery`. Dashboard adds Shadow discovery table + Unknown models KPI.
- Does not change any block policy. Operator live proof remains the gate. No keys in git or chat.

## Current Status (Session 51 — 2026-10-10)

Shadow discovery signals shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 51 — unknown-model discovery on admin summary and dashboard

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Unknown models appear in the Shadow discovery table after traffic.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 51 adds basic shadow-AI discovery (unknown models). Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

## Decisions (Session 52 — shadow discovery spend)

- `discoveryStatus()` sums `estimatedCostUsd` for unknown models and ranks rows by spend.
- Status field `unknownCostUsd`. Dashboard table adds a USD column; KPI adds Unknown USD.
- CLI flag `--discovery` prints the same object (respects `--day=`).
- Does not change catalog matching or any block policy. Fallback price is already on the event.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 52 — 2026-10-10)

Shadow discovery spend shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 52 — unknown-model cost on admin, dashboard, and CLI

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Unknown models and their estimated spend appear in the Shadow discovery table after traffic.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 52 adds estimated spend to shadow discovery. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.


## Decisions (Session 53 — shadow discovery spend warn)

- `discoveryStatus()` sets `warn` when unknown-model estimated spend meets `TOKENPULSE_DISCOVERY_WARN_USD` (default 10).
- `TOKENPULSE_DISCOVERY_WARN_USD=0` disables warnings. Status adds `warnThresholdUsd`.
- Dashboard Shadow discovery meta shows WARN and Unknown USD KPI is highlighted when warn is true.
- Does not change catalog matching, cost estimation, or any block policy.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 53 — 2026-10-11)

Shadow discovery spend warn shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 53 — discovery spend warn on admin summary and dashboard

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Unknown models, their estimated spend, and a warn (when ≥ threshold) appear in the Shadow discovery table after traffic.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 53 adds a configurable spend warn for unknown-model discovery. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

## Decisions (Session 54 — unattributed traffic status)

- `unattributedStatus()` sums calls and estimated cost where `teamId` or `appId` is `"default"` (missing attribution headers).
- Status fields: defaultTeamCalls/Cost, defaultAppCalls/Cost, unattributedCostUsd (OR of the two), warnThresholdUsd, warn.
- `TOKENPULSE_UNATTRIBUTED_WARN_USD` (default 10; 0 disables). Notes are skipped.
- Admin summary includes `unattributed`. Dashboard adds Unattributed traffic table + Unattributed USD KPI (highlighted on warn).
- CLI: `--unattributed`. Does not change any block policy or header parsing.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 54 — 2026-10-11)

Unattributed traffic status shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 54 — default team/app unattributed spend on admin, dashboard, and CLI

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Unknown models, unattributed spend, and warns appear after traffic.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 54 adds unattributed (default team/app) spend visibility as a shadow signal. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.


## Decisions (Session 55 — alerts aggregator)

- `alertsStatus()` collects operator-visible warns from existing status objects (budgetWarns, rateWarns, limitWarns, discovery.warn, unattributed.warn, key idle/expiry counts).
- Admin summary includes `alerts` (version, count, rows, notes). Dashboard renders an Alerts table at the top of the detail section.
- No new thresholds or block policies. Source status objects remain the source of truth.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 55 — 2026-10-12)

Alerts aggregator shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 55 — unified alerts status on admin summary and dashboard

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Unknown models, unattributed spend, alerts, and warns appear after traffic.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 55 adds a single Alerts view aggregating existing warn signals. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.



## Decisions (Session 56 — CLI alerts)

- CLI `--alerts` (and `npm run alerts`) prints the same `alerts` object as `/v1/admin/summary`.
- Reuses `adminSummary()` so warn counts stay consistent with the dashboard.
- Optional `--day=` scopes the underlying ledger reads.
- No new thresholds or block policies. Source status objects remain the source of truth.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 56 — 2026-10-12)

CLI alerts flag shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 56 — `--alerts` on CLI and `npm run alerts`

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Unknown models, unattributed spend, alerts, and warns appear after traffic. CLI: `npm run alerts`.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 56 adds a CLI path to the unified alerts aggregator. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

## Decisions (Session 57 — alert webhook)

- Optional `TOKENPULSE_ALERT_WEBHOOK_URL` (http/https).
- CLI `--alerts` POSTs the alerts object when the URL is set (timeout 10s). Result included in output.
- `webhookStatus()` exposes configured + host only (full URL never on admin/dashboard).
- Admin summary includes `webhook`. Dashboard Alerts section shows configured status.
- Does not change thresholds, block policy, or existing alert aggregation.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 57 — 2026-10-13)

Alert webhook shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 57 — optional webhook POST of alerts from CLI `--alerts`

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Unknown models, unattributed spend, alerts, and warns appear after traffic. CLI: `npm run alerts` (optionally with webhook URL).
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 57 adds optional webhook delivery for the unified alerts aggregator. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

## Decisions (Session 58 — process alert poster)

- Optional `TOKENPULSE_ALERT_WEBHOOK_INTERVAL_SEC` (min 30 seconds; unset or 0 disables).
- `startGateway` starts a background timer when the interval is set.
- Timer loads `adminSummary` and calls `postAlerts` only when `alerts.count > 0`.
- CLI `--alerts` path is unchanged. Webhook URL still never serialized.
- Does not change thresholds, block policy, or alert aggregation.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 58 — 2026-10-14)

Process-level alert poster shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 58 — optional background POST of unified alerts from the gateway process

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Unknown models, unattributed spend, alerts, and warns appear after traffic. CLI: `npm run alerts`. Optional: set `TOKENPULSE_ALERT_WEBHOOK_URL` + `TOKENPULSE_ALERT_WEBHOOK_INTERVAL_SEC`.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 58 adds an optional process-level alert poster so operators do not need to cron the CLI. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# optional background alerts:
# TOKENPULSE_ALERT_WEBHOOK_URL=https://hooks.example.com/tokenpulse TOKENPULSE_ALERT_WEBHOOK_INTERVAL_SEC=300 npm run start:gateway
```

## Decisions (Session 59 — Prometheus metrics)

- `GET /v1/admin/metrics` returns Prometheus text exposition (auth required, same as other admin routes).
- Counters/gauges for calls, allowed, blocked, notes, tokens, costUsd, alerts count, discovery unknown cost, unattributed cost, chain_ok.
- Generated from the same `adminSummary` window (optional `?day=`). No secrets, no raw prompts.
- Does not change block policy, thresholds, or ledger writes. Useful for operator scrapes / Grafana.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 59 — 2026-10-14)

Prometheus metrics endpoint shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 59 — optional Prometheus metrics on `GET /v1/admin/metrics`

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Unknown models, unattributed spend, alerts, and warns appear after traffic. CLI: `npm run alerts`. Optional: set `TOKENPULSE_ALERT_WEBHOOK_URL` + `TOKENPULSE_ALERT_WEBHOOK_INTERVAL_SEC`. Metrics available at `/v1/admin/metrics`.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 59 adds a Prometheus metrics endpoint for operator monitoring. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# scrape: curl -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
```


## Decisions (Session 60 — latency status)

- `latencyStatus()` computes avg / p50 / p95 / max latencyMs from non-note ledger events in the admin summary window.
- Admin summary exposes `latency`. Dashboard renders a Latency table.
- Prometheus metrics expose `tokenpulse_latency_avg_ms` and `tokenpulse_latency_p95_ms`.
- Does not change routing, block policy, or ledger writes.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 60 — 2026-10-15)

Latency status shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 60 — latency percentiles on admin summary, dashboard, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Latency percentiles appear after traffic. Metrics at `/v1/admin/metrics`.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 60 adds latency visibility for operators. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# scrape: curl -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
```


## Decisions (Session 61 — upstream health status)

- `upstreamHealthStatus()` counts successes (allow) and failures (block + `upstream_error`) from non-note ledger events.
- Admin summary exposes `upstreamHealth` (samples, successes, failures, successRate). Dashboard renders an Upstream health table + Upstream % KPI.
- Prometheus metrics expose `tokenpulse_upstream_success_rate_percent` and `tokenpulse_upstream_failures_total`.
- Does not change routing, fallback, or block policy. Notes are excluded.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 61 — 2026-10-15)

Upstream health status shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 61 — upstream success/failure visibility on admin summary, dashboard, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Latency percentiles and upstream health appear after traffic. Metrics at `/v1/admin/metrics`.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 61 adds upstream outcome visibility for operators. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# scrape: curl -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
```

## Decisions (Session 62 — observability packaging)

- Added `docs/observability.md` with Prometheus scrape examples and metric table.
- Added importable Grafana dashboard JSON at `docs/grafana-tokenpulse.json` (calls, cost, latency p95, upstream success, alerts, failures).
- Updated `DEMO.md` with a short optional recording step for the metrics endpoint.
- Does not change gateway behavior, metrics exposition, or any policy.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 62 — 2026-10-16)

Observability packaging shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 62 — Prometheus scrape docs + basic Grafana dashboard JSON for demo readiness

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, and optionally the metrics endpoint. See `docs/observability.md`.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 62 adds ready-to-import Grafana packaging so operators can show enterprise observability in the demo. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# scrape: curl -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
```


## Decisions (Session 63 — daily burn-rate projection)

- `projectBurnRate()` / `burnRateStatus()` projects today's allowed spend linearly to end of UTC day for every configured daily cap (team and app).
- Admin summary exposes `burnRate` (hoursElapsed, rows, exhaustWarnCount). Dashboard renders a Daily burn rate table + Burn warns KPI.
- Prometheus metric `tokenpulse_burn_exhaust_warn_count`. Monthly caps are not projected.
- Does not change `evaluateBudget` or any block policy. Notes excluded via existing budget status (allowed events only).
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 63 — 2026-10-16)

Daily burn-rate projection shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 63 — projected daily exhaust visibility on admin summary, dashboard, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, burn-rate, and optionally the metrics endpoint. See `docs/observability.md`.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 63 adds linear daily burn-rate projection so operators can see which caps will exhaust before midnight UTC. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# scrape: curl -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
```


## Decisions (Session 64 — burn-rate alerts)

- `alertsStatus()` now includes `burnRate.exhaustWarnCount` as a warn row (`source: burn`).
- Message: N daily cap(s) projected to exhaust before end of UTC day.
- No new thresholds. Source remains `burnRateStatus`. Does not change block policy.
- Admin summary, dashboard Alerts table, CLI `--alerts`, and webhook all pick it up automatically.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 64 — 2026-10-17)

Burn-rate exhaust warns now appear in the unified alerts aggregator. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 64 — burn-rate projected exhaust included in alerts aggregator

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, burn-rate, alerts, and optionally the metrics endpoint. See `docs/observability.md`.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 64 wires Session 63 burn-rate exhaust warnings into the existing alerts aggregator so operators see them in one place (dashboard, CLI, webhook). Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# scrape: curl -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
```

## Decisions (Session 65 — block reasons status)

- `blockReasonsStatus()` aggregates policyIds from block events (top 12 by count).
- Admin summary exposes `blockReasons`. Dashboard renders a Block reasons table.
- Prometheus metric `tokenpulse_block_unique_policies`. CLI: `--block-reasons`.
- Does not change any deny path or HTTP codes. Notes and allows are excluded.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 65 — 2026-10-18)

Block reasons status shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 65 — top block policy reasons on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, burn-rate, alerts, block reasons, and optionally the metrics endpoint. See `docs/observability.md`.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 65 adds visibility into the most common reasons requests are blocked. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# scrape: curl -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
```

## Decisions (Session 66 — model spend status)

- `modelSpendStatus()` aggregates allowed events by client model id: calls, tokens, estimatedCostUsd, percent of total.
- Admin summary exposes `modelSpend`. Dashboard renders a Model spend table.
- Prometheus metric `tokenpulse_model_unique_models`. CLI: `--model-spend`.
- Does not change pricing table, cost estimation, or any block policy. Notes and blocks excluded.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 66 — 2026-10-20)

Model spend ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 66 — top models by estimated spend on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, burn-rate, alerts, block reasons, model spend, and optionally the metrics endpoint. See `docs/observability.md`.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 66 adds visibility into which models drive estimated spend so operators can prioritize cost controls. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# scrape: curl -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
```

## Decisions (Session 67 — team spend status)

- `teamSpendStatus()` aggregates allowed events by teamId: calls, tokens, estimatedCostUsd, percent of total.
- Admin summary exposes `teamSpend`. Dashboard renders a Team spend table.
- Prometheus metric `tokenpulse_team_unique_teams`. CLI: `--team-spend`.
- Does not change attribution defaults or any block policy. Notes and blocks excluded.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 67 — 2026-10-20)

Team spend ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 67 — top teams by estimated spend on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, burn-rate, alerts, block reasons, model spend, team spend, and optionally the metrics endpoint. See `docs/observability.md`.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 67 adds visibility into which teams drive estimated spend so operators can prioritize cost controls and attribution. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# scrape: curl -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
```


## Decisions (Session 68 — app spend status)

- `appSpendStatus()` aggregates allowed events by appId: calls, tokens, estimatedCostUsd, percent of total.
- Admin summary exposes `appSpend`. Dashboard renders an App spend table (ranked with %).
- Prometheus metric `tokenpulse_app_unique_apps`. CLI: `--app-spend`.
- Does not change attribution defaults or any block policy. Notes and blocks excluded.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 68 — 2026-10-20)

App spend ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 68 — top apps by estimated spend on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, burn-rate, alerts, block reasons, model/team/app spend, and optionally the metrics endpoint. See `docs/observability.md`.
2. Personalized emails / first `PILOT.md` conversation.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 68 adds visibility into which apps drive estimated spend so operators can prioritize app-level cost controls. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# scrape: curl -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
```


## Decisions (Session 69 — outreach drafts)

- Added `OUTREACH_DRAFTS.md` with ready-to-personalize emails for Palo Alto, Cisco/Splunk, and CrowdStrike (Tier A).
- Drafts follow `OUTREACH.md` rules: short, technical, adjacent value, no bulk, no secrets, no $1B language.
- Still gated on operator-recorded DEMO (Railway mock URL preferred). Do not send until recording exists.
- DEMO.md updated with a short note on the spend ranking tables for the recording script.

## Current Status (Session 69 — 2026-10-21)

Personalized Tier A drafts prepared. Product unchanged from Session 68. Operator Railway deploy + DEMO recording remains the hard gate before any outreach.

- [x] Session 69 — personalized outreach drafts for top Tier A buyers (`OUTREACH_DRAFTS.md`) + DEMO.md spend ranking note

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, burn-rate, alerts, block reasons, model/team/app spend, and optionally the metrics endpoint. See `docs/observability.md` and updated `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 69 prepares sale outreach drafts. Automation cannot log into Railway or record the demo. Do not paste Railway, provider, or client-key secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# scrape: curl -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
```


## Decisions (Session 70 — monthly burn-rate projection)

- Extended `projectBurnRate` / `burnRateStatus` with linear month-to-date projection to end of UTC month for every configured monthly cap (team and app).
- Admin summary `burnRate` now includes `monthlyRows` and `monthlyExhaustWarnCount`. Dashboard renders a second table under Daily burn rate.
- Prometheus metric `tokenpulse_burn_monthly_exhaust_warn_count`.
- Does not change hard monthly caps or any block policy. Operator visibility only.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 70 — 2026-10-22)

Monthly burn-rate projection shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 70 — monthly spend projection on admin summary, dashboard, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app spend, and optionally the metrics endpoint. See `docs/observability.md` and updated `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 70 adds month-end spend projection so operators can see which monthly caps will exhaust. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# scrape: curl -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
```

## Decisions (Session 71 — README sync + MVP completeness note)

- README “What works today” header updated from Session 63 to Session 70.
- Added explicit rows for block-reasons status and model/team/app spend ranking (already shipped in Sessions 65–68).
- No code changes. Product remains feature-complete for the self-hosted MVP scope defined in ARCHITECTURE.md and ROADMAP.md.
- Operator Railway mock deploy + DEMO.md recording remains the hard gate before any outreach.
- Chat-pasted tokens remain unusable. Live upstream stays operator-env only.

## Current Status (Session 71 — 2026-10-22)

README synchronized with latest shipped capabilities. Sale materials unchanged. Operator still must deploy the mock demo and record DEMO.md.

- [x] Session 71 — README “What works today” updated to Session 70; confirmed MVP feature completeness for sale packaging

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app spend, and optionally the metrics endpoint. See `docs/observability.md` and updated `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 71 is a documentation sync confirming the MVP is ready for the operator demo recording step. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# scrape: curl -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
```

## Decisions (Session 72 — operator pricing overrides)

- Optional `TOKENPULSE_PRICING_PATH` (default `data/pricing.json`) supplies model → {input, output} USD-per-1M overrides.
- Merges over the static default table. Invalid/missing file is a no-op.
- Loaded at gateway start. `pricingStatus` exposes `overrideCount`.
- `isKnownCatalogModel` uses the runtime table so custom models can leave shadow discovery.
- Example file committed as `pricing.example.json`. No secrets.
- Live-upstream demo recording remains an operator gate. Chat-pasted tokens remain unusable.

## Current Status (Session 72 — 2026-10-23)

Operator pricing overrides shipped. Sale materials unchanged. Operator still must deploy the mock demo and record DEMO.md.

- [x] Session 72 — optional pricing catalog overrides via `TOKENPULSE_PRICING_PATH`

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app spend, and optionally the metrics endpoint. See `docs/observability.md` and updated `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 72 adds operator control over the pricing catalog so real deployments can use accurate list prices without code changes. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# optional: TOKENPULSE_PRICING_PATH=./pricing.example.json
# scrape: curl -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
```

## Decisions (Session 73 — high-cost request ranking)

- `highCostStatus()` ranks the top 10 allowed events by `estimatedCostUsd` (positive cost only).
- Admin summary exposes `highCost`. Dashboard renders a High-cost requests table (time, team, app, model, tokens, USD, requestId).
- Prometheus metrics: `tokenpulse_high_cost_top_usd` and `tokenpulse_high_cost_count`.
- CLI: `--high-cost`.
- Notes and blocks excluded. No raw prompts.
- Does not change any policy, pricing, or ledger write path.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 73 — 2026-10-23)

High-cost request ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 73 — top high-cost allowed requests on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app spend, high-cost requests, and optionally the metrics endpoint. See `docs/observability.md` and updated `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 73 adds visibility into the most expensive individual allowed requests so operators can quickly spot outliers. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# scrape: curl -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
# high-cost: npx tsx src/cli.ts --high-cost
```

## Decisions (Session 74 — slow request ranking)

- `slowRequestStatus()` ranks the top 10 allowed events by `latencyMs` (positive latency only).
- Admin summary exposes `slowRequests`. Dashboard renders a Slow requests table (time, team, app, model, latency ms, tokens, USD, requestId).
- Prometheus metrics: `tokenpulse_slow_top_ms` and `tokenpulse_slow_count`.
- CLI: `--slow`.
- Notes and blocks excluded. No raw prompts.
- Does not change any policy, pricing, or ledger write path.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 74 — 2026-10-24)

Slow request ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 74 — top slow allowed requests on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app spend, high-cost + slow requests, and optionally the metrics endpoint. See `docs/observability.md` and updated `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 74 adds visibility into the slowest individual allowed requests so operators can quickly spot latency outliers. Automation cannot log into Railway. Do not paste Railway, provider, or client-key secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# scrape: curl -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
# slow: npx tsx src/cli.ts --slow
```

## Decisions (Session 75 — project validation)

- Full test suite: **138/138 pass** (including Session 74 `slowRequests` and Session 73 `highCost`).
- Code integrations verified: `src/slowRequests.ts`, admin summary + dashboard table, CLI `--slow`, Prometheus `tokenpulse_slow_top_ms` / `tokenpulse_slow_count`.
- Sale / pilot artifacts present: `SALE.md`, `BUYERS.md`, `OUTREACH.md`, `OUTREACH_DRAFTS.md`, `DEMO.md`, `LANDING.md`, `PILOT.md`, `PROOF.md`, `Dockerfile`, `compose.pilot.yaml`, `railway.toml`.
- Gateway health smoke: mock bind responds `200` on `/health`.
- README capability table bumped to Session 74 and lists high-cost + slow ranking.
- No product policy changes. No secrets in git or chat.
- Operator Railway deploy + DEMO recording remains the hard gate before outreach.

## Current Status (Session 75 — 2026-10-24)

Project validation passed. MVP + sale pack intact. Operator still must deploy mock demo and record `DEMO.md`.

- [x] Session 75 — full suite green (138 tests) + README Session 74 sync + artifact inventory

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app spend, high-cost + slow requests, and optionally the metrics endpoint.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 75 is validation-only: tests green, Session 74 integrations confirmed, README synced. Automation cannot log into Railway. Do not paste secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# slow: npx tsx src/cli.ts --slow
# high-cost: npx tsx src/cli.ts --high-cost
```

## Decisions (Session 76 — high-token request ranking)

- `tokenVolumeStatus()` ranks the top 10 allowed events by `totalTokens` (positive tokens only).
- Admin summary exposes `tokenVolume`. Dashboard renders a High-token requests table (time, team, app, model, tokens, USD, requestId).
- Prometheus metrics: `tokenpulse_token_volume_top_tokens` and `tokenpulse_token_volume_count`.
- CLI: `--token-volume`.
- Notes and blocks excluded. No raw prompts.
- Does not change any policy, pricing, or ledger write path.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 76 — 2026-10-24)

High-token request ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 76 — top high-token allowed requests on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app spend, high-cost + slow + high-token requests, and optionally the metrics endpoint.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 76 adds high-token request ranking parallel to high-cost and slow. Automation cannot log into Railway. Do not paste secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# token-volume: npx tsx src/cli.ts --token-volume
# high-cost: npx tsx src/cli.ts --high-cost
# slow: npx tsx src/cli.ts --slow
```

## Decisions (Session 77 — CI workflow + public package-lock)

- Added `.github/workflows/ci.yml`: on push/PR to main, Node 22, `npm ci` + `npm test`.
- Regenerated `package-lock.json` against the public npm registry so CI and fresh installs are reliable (prior internal-registry entries caused fetch failures).
- README capability header confirmed at Session 76 (includes high-token ranking).
- Full suite: **140/140 pass**.
- No product policy or ledger changes.
- Operator Railway deploy + DEMO recording remains the hard gate before outreach. No secrets in git or chat.

## Current Status (Session 77 — 2026-10-24)

CI added. MVP + sale pack intact. Operator still must deploy mock demo and record `DEMO.md`.

- [x] Session 77 — GitHub Actions CI + public package-lock

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app spend, high-cost + slow + high-token requests, and optionally the metrics endpoint.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 77 adds CI so every push is validated automatically. Automation cannot log into Railway. Do not paste secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# token-volume: npx tsx src/cli.ts --token-volume
# high-cost: npx tsx src/cli.ts --high-cost
# slow: npx tsx src/cli.ts --slow
```


## Decisions (Session 78 — daily spend status)

- `dailySpendStatus()` groups allowed events by UTC day and returns the most recent 7 days present (chronological).
- Admin summary includes `dailySpend`. Dashboard renders a Daily spend table.
- CLI `--daily-spend`.
- Notes and blocks excluded. No raw prompts. Does not change policy or metering.
- Complements the Session 76 high-token ranking.
- Operator Railway deploy + DEMO recording remains the hard gate before outreach.
- Chat-pasted tokens remain unusable. No secrets in git or chat.

## Current Status (Session 78 — 2026-10-24)

Daily spend visibility shipped (after concurrent Session 76/77). Sale materials unchanged. Operator still must deploy the mock demo and record DEMO.md.

- [x] Session 78 — daily spend status (admin summary + dashboard table + CLI `--daily-spend`)

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app/daily spend, high-cost + slow + high-token requests, and optionally the metrics endpoint.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 78 adds daily spend ranking for richer demo recordings. Automation cannot log into Railway. Do not paste secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# daily: npx tsx src/cli.ts --daily-spend
```

## Decisions (Session 79 — demo script + README sync for latest rankings)

- Updated `DEMO.md` with explicit sections for high-token ranking (Session 76) and daily spend (Session 78).
- Added a concise operator recording checklist covering the full set of dashboard tables that should appear in the DEMO recording.
- README “What works today” header advanced to Session 78 and includes the daily spend row.
- No code, policy, or ledger changes. Product remains feature-complete for the self-hosted MVP.
- Operator Railway (or local) mock deploy + DEMO.md recording remains the hard gate before outreach. No secrets in git or chat.

## Current Status (Session 79 — 2026-10-25)

Demo script and README synced to Session 78 visibility features. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 79 — DEMO.md high-token + daily-spend sections + recording checklist; README Session 78 sync

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app/daily spend, high-cost + slow + high-token requests, and optionally the metrics endpoint. Use the new checklist in `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 79 prepares a tighter recording script so the operator demo covers every shipped ranking table. Automation cannot log into Railway. Do not paste secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# daily: npx tsx src/cli.ts --daily-spend
# token-volume: npx tsx src/cli.ts --token-volume
```

## Decisions (Session 80 — monthly spend ranking)

- `monthlySpendStatus()` groups allowed events by UTC month (`YYYY-MM`) for the last N months present (default 6).
- Admin summary exposes `monthlySpend`. Dashboard renders a Monthly spend table (month, calls, tokens, USD).
- Prometheus metrics: `tokenpulse_monthly_spend_months` and `tokenpulse_monthly_spend_total_usd`.
- CLI: `--monthly-spend`.
- Notes and blocks excluded. No raw prompts.
- Does not change any policy, pricing, or ledger write path.
- Complements daily spend (Session 78) and monthly burn-rate projection.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 80 — 2026-10-25)

Monthly spend ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 80 — top monthly allowed spend on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app/daily/monthly spend, high-cost + slow + high-token requests, and optionally the metrics endpoint. Use the checklist in `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 80 adds monthly spend ranking parallel to daily spend for richer multi-month CFO visibility in the demo recording. Automation cannot log into Railway. Do not paste secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# monthly: npx tsx src/cli.ts --monthly-spend
# daily: npx tsx src/cli.ts --daily-spend
```

## Decisions (Session 81 — weekly spend ranking)

- `weeklySpendStatus()` groups allowed events by UTC ISO week (`YYYY-Www`) for the last N weeks present (default 8).
- Admin summary exposes `weeklySpend`. Dashboard renders a Weekly spend table (week, calls, tokens, USD).
- Prometheus metrics: `tokenpulse_weekly_spend_weeks` and `tokenpulse_weekly_spend_total_usd`.
- CLI: `--weekly-spend`.
- Notes and blocks excluded. No raw prompts.
- Does not change any policy, pricing, or ledger write path.
- Complements daily spend (Session 78) and monthly spend (Session 80).
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 81 — 2026-10-25)

Weekly spend ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 81 — top weekly allowed spend on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app/daily/weekly/monthly spend, high-cost + slow + high-token requests, and optionally the metrics endpoint. Use the checklist in `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 81 adds weekly spend ranking (ISO weeks) between daily and monthly for richer multi-period CFO visibility in the demo recording. Automation cannot log into Railway. Do not paste secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# weekly: npx tsx src/cli.ts --weekly-spend
# daily: npx tsx src/cli.ts --daily-spend
# monthly: npx tsx src/cli.ts --monthly-spend
```



## Decisions (Session 82 — endpoint spend ranking)

- `endpointSpendStatus()` classifies allowed events as `embeddings` (policy id `endpoint:embeddings`) or `chat` (default).
- Admin summary exposes `endpointSpend`. Dashboard renders an Endpoint spend table (endpoint, calls, tokens, USD, %).
- Prometheus metrics: `tokenpulse_endpoint_unique_endpoints` and `tokenpulse_endpoint_spend_total_usd`.
- CLI: `--endpoint-spend`.
- Notes and blocks excluded. No raw prompts.
- Does not change any policy, pricing, or ledger write path.
- Complements weekly (Session 81) and model/team/app spend for richer demo recordings.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 82 — 2026-10-25)

Endpoint spend ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 82 — endpoint (chat vs embeddings) allowed spend on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app/daily/weekly/monthly/endpoint spend, high-cost + slow + high-token requests, and optionally the metrics endpoint. Use the checklist in `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 82 adds endpoint spend ranking so the demo can show chat vs embeddings cost split (alongside weekly spend from Session 81). Automation cannot log into Railway. Do not paste secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# endpoint: npx tsx src/cli.ts --endpoint-spend
# weekly: npx tsx src/cli.ts --weekly-spend
```


## Decisions (Session 83 — upstream spend ranking)

- `upstreamSpendStatus()` classifies allowed events by `upstream:<source>` policy id, or `mock` when `mock-allow` is present (else `unknown`).
- Admin summary exposes `upstreamSpend`. Dashboard renders an Upstream spend table (source, calls, tokens, USD, %).
- Prometheus metrics: `tokenpulse_upstream_unique_sources` and `tokenpulse_upstream_spend_total_usd`.
- CLI: `--upstream-spend`.
- Notes and blocks excluded. No raw prompts.
- Does not change any policy, pricing, or ledger write path.
- Complements endpoint spend (Session 82) and multi-upstream fallback/weighted routing for provider-level cost split in demos.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 83 — 2026-10-26)

Upstream spend ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 83 — upstream/provider spend ranking on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app/daily/weekly/monthly/endpoint/upstream spend, high-cost + slow + high-token requests, and optionally the metrics endpoint. Use the checklist in `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 83 adds upstream spend ranking so the demo can show cost split across providers (or mock) alongside endpoint spend. Automation cannot log into Railway. Do not paste secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# upstream: npx tsx src/cli.ts --upstream-spend
# endpoint: npx tsx src/cli.ts --endpoint-spend
```

## Decisions (Session 84 — blocked impact / estimated avoided spend)

- `blockedImpactStatus()` ranks block events by model and estimates avoided USD using a fixed prompt-token assumption (default 256, override `TOKENPULSE_BLOCKED_ASSUME_TOKENS`) × model input price.
- Admin summary exposes `blockedImpact`. Dashboard renders a Blocked impact table (model, blocks, est. avoided USD, %).
- Prometheus metrics: `tokenpulse_blocked_impact_total` and `tokenpulse_estimated_avoided_usd`.
- CLI: `--blocked-impact`.
- Blocks store zero real tokens; this is visibility/demo only. Does not change any policy, pricing, or ledger write path.
- Notes and allows excluded. No raw prompts.
- Complements block reasons (count) and allowed spend rankings for CFO/CISO “policy value” narrative.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 84 — 2026-10-26)

Blocked impact ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 84 — blocked impact / estimated avoided spend on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app/daily/weekly/monthly/endpoint/upstream spend, blocked impact, high-cost + slow + high-token requests, and optionally the metrics endpoint. Use the checklist in `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 84 adds blocked-impact ranking so the demo can show estimated USD avoided by policy (alongside count-based block reasons). Automation cannot log into Railway. Do not paste secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# blocked impact: npx tsx src/cli.ts --blocked-impact
# upstream: npx tsx src/cli.ts --upstream-spend
```


## Decisions (Session 85 — hourly spend ranking)

- `hourlySpendStatus()` groups allowed events by UTC hour (`YYYY-MM-DDTHH`) for the last N hours present (default 24).
- Admin summary exposes `hourlySpend`. Dashboard renders an Hourly spend table (hour, calls, tokens, USD).
- Prometheus metrics: `tokenpulse_hourly_spend_hours` and `tokenpulse_hourly_spend_total_usd`.
- CLI: `--hourly-spend`.
- Notes and blocks excluded. No raw prompts.
- Does not change any policy, pricing, or ledger write path.
- Complements daily (Session 78), weekly (Session 81), and monthly (Session 80) spend for finer-grained recent burn visibility in demos.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 85 — 2026-10-27)

Hourly spend ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 85 — hourly spend ranking on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app/daily/weekly/hourly/monthly/endpoint/upstream spend, blocked impact, high-cost + slow + high-token requests, and optionally the metrics endpoint. Use the checklist in `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 85 adds hourly spend ranking (UTC hours) for recent burn visibility alongside daily/weekly/monthly. Automation cannot log into Railway. Do not paste secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# hourly: npx tsx src/cli.ts --hourly-spend
# weekly: npx tsx src/cli.ts --weekly-spend
# daily: npx tsx src/cli.ts --daily-spend
```

## Decisions (Session 86 — efficiency ranking)

- `efficiencyStatus()` ranks models by estimated USD per 1M tokens on allowed events (lowest first).
- Admin summary exposes `efficiency`. Dashboard renders an Efficiency table (model, calls, tokens, USD, USD/1M, avg tokens/call).
- Prometheus metrics: `tokenpulse_efficiency_overall_usd_per_1m` and `tokenpulse_efficiency_calls`.
- CLI: `--efficiency`.
- Notes and blocks excluded. No raw prompts.
- Does not change any policy, pricing, or ledger write path.
- Complements absolute spend rankings so the demo can show cost-per-token efficiency.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 86 — 2026-10-27)

Efficiency ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 86 — efficiency ranking (USD per 1M tokens) on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app/daily/weekly/hourly/monthly/endpoint/upstream spend, blocked impact, high-cost + slow + high-token requests, efficiency, and optionally the metrics endpoint. Use the checklist in `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 86 adds efficiency ranking (USD per 1M tokens) for FinOps model choice visibility alongside absolute spend tables. Automation cannot log into Railway. Do not paste secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# efficiency: npx tsx src/cli.ts --efficiency
# hourly: npx tsx src/cli.ts --hourly-spend
```

## Decisions (Session 87 — team efficiency ranking)

- `teamEfficiencyStatus()` ranks teams by estimated USD per 1M tokens on allowed events (lowest first).
- Admin summary exposes `teamEfficiency`. Dashboard renders a Team efficiency table (team, calls, tokens, USD, USD/1M, avg tokens/call).
- Prometheus metrics: `tokenpulse_team_efficiency_overall_usd_per_1m` and `tokenpulse_team_efficiency_calls`.
- CLI: `--team-efficiency`.
- Notes and blocks excluded. No raw prompts.
- Does not change any policy, pricing, or ledger write path.
- Complements model efficiency (Session 86) so the demo can show cost-per-token efficiency by team.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 87 — 2026-10-28)

Team efficiency ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 87 — team efficiency ranking (USD per 1M tokens by team) on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app/daily/weekly/hourly/monthly/endpoint/upstream spend, blocked impact, high-cost + slow + high-token requests, efficiency, team efficiency, and optionally the metrics endpoint. Use the checklist in `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 87 adds team efficiency ranking (USD per 1M tokens by team) for FinOps team-level model-choice visibility alongside absolute spend and model efficiency tables. Automation cannot log into Railway. Do not paste secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# team efficiency: npx tsx src/cli.ts --team-efficiency
# efficiency: npx tsx src/cli.ts --efficiency
```


## Decisions (Session 88 — app efficiency ranking)

- `appEfficiencyStatus()` ranks apps by estimated USD per 1M tokens on allowed events (lowest first).
- Admin summary exposes `appEfficiency`. Dashboard renders an App efficiency table (app, calls, tokens, USD, USD/1M, avg tokens/call).
- Prometheus metrics: `tokenpulse_app_efficiency_overall_usd_per_1m` and `tokenpulse_app_efficiency_calls`.
- CLI: `--app-efficiency`.
- Notes and blocks excluded. No raw prompts.
- Does not change any policy, pricing, or ledger write path.
- Complements team efficiency (Session 87) and model efficiency so the demo can show cost-per-token efficiency by app.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 88 — 2026-10-28)

App efficiency ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 88 — app efficiency ranking (USD per 1M tokens by app) on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app/daily/weekly/hourly/monthly/endpoint/upstream spend, blocked impact, high-cost + slow + high-token requests, efficiency, team efficiency, app efficiency, and optionally the metrics endpoint. Use the checklist in `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 88 adds app efficiency ranking (USD per 1M tokens by app) for FinOps app-level model-choice visibility alongside absolute spend, model efficiency, and team efficiency tables. Automation cannot log into Railway. Do not paste secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# app efficiency: npx tsx src/cli.ts --app-efficiency
# team efficiency: npx tsx src/cli.ts --team-efficiency
```

## Decisions (Session 89 — upstream efficiency ranking)

- `upstreamEfficiencyStatus()` ranks upstream sources by estimated USD per 1M tokens on allowed events (lowest first).
- Source resolution matches upstream spend (`upstream:<source>` policy id or `mock`).
- Admin summary exposes `upstreamEfficiency`. Dashboard renders an Upstream efficiency table (source, calls, tokens, USD, USD/1M, avg tokens/call).
- Prometheus metrics: `tokenpulse_upstream_efficiency_overall_usd_per_1m` and `tokenpulse_upstream_efficiency_calls`.
- CLI: `--upstream-efficiency`.
- Notes and blocks excluded. No raw prompts.
- Does not change any policy, pricing, or ledger write path.
- Complements app/team/model efficiency so the demo can show cost-per-token efficiency by provider/source.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 89 — 2026-10-29)

Upstream efficiency ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 89 — upstream efficiency ranking (USD per 1M tokens by upstream source) on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app/daily/weekly/hourly/monthly/endpoint/upstream spend, blocked impact, high-cost + slow + high-token requests, efficiency, team efficiency, app efficiency, upstream efficiency, and optionally the metrics endpoint. Use the checklist in `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 89 adds upstream efficiency ranking (USD per 1M tokens by provider/source) for FinOps provider-level model-choice visibility alongside absolute spend and other efficiency tables. Automation cannot log into Railway. Do not paste secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# upstream efficiency: npx tsx src/cli.ts --upstream-efficiency
# app efficiency: npx tsx src/cli.ts --app-efficiency
```


## Decisions (Session 90 — key efficiency ranking)

- `keyEfficiencyStatus()` ranks client keys by estimated USD per 1M tokens on allowed events (lowest first).
- Key resolution uses `key:<id>` policy id; events without it are bucketed as `gateway`.
- Admin summary exposes `keyEfficiency`. Dashboard renders a Key efficiency table (key, calls, tokens, USD, USD/1M, avg tokens/call).
- Prometheus metrics: `tokenpulse_key_efficiency_overall_usd_per_1m` and `tokenpulse_key_efficiency_calls`.
- CLI: `--key-efficiency`.
- Notes and blocks excluded. No raw prompts or digests.
- Does not change any policy, pricing, or ledger write path.
- Complements app/team/model/upstream efficiency so the demo can show cost-per-token efficiency by issued client key.
- Railway public URL and live-upstream recording remain operator gates. No keys in git or chat.

## Current Status (Session 90 — 2026-10-29)

Key efficiency ranking shipped. Sale materials unchanged. Operator still must deploy the mock demo and record `DEMO.md`.

- [x] Session 90 — key efficiency ranking (USD per 1M tokens by client key) on admin summary, dashboard, CLI, and Prometheus metrics

## Next Up (highest priority)

1. **Operator:** Railway → New Project → GitHub `tokenpulse` → set `TOKENPULSE_MOCK_UPSTREAM=1` and `TOKENPULSE_GATEWAY_TOKEN` in the dashboard → Generate domain → record DEMO.md against that URL (no keys on camera). Show latency, upstream health, daily + monthly burn-rate, alerts, block reasons, model/team/app/daily/weekly/hourly/monthly/endpoint/upstream spend, blocked impact, high-cost + slow + high-token requests, efficiency, team efficiency, app efficiency, upstream efficiency, key efficiency, and optionally the metrics endpoint. Use the checklist in `DEMO.md`.
2. After recording exists: personalize names in `OUTREACH_DRAFTS.md` (≤10 total) and send first wave. Follow `OUTREACH.md` sequence.
3. After first pilot quote: fill References.

## Handoff for next session

**Active project:** Tokenpulse only.
Session 90 adds key efficiency ranking (USD per 1M tokens by client key or gateway) for FinOps key-level model-choice visibility alongside absolute spend and other efficiency tables. Automation cannot log into Railway. Do not paste secrets into chat. Do not send outreach until the recording exists.

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# key efficiency: npx tsx src/cli.ts --key-efficiency
# upstream efficiency: npx tsx src/cli.ts --upstream-efficiency
```
