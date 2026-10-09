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
