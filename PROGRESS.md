# Tokenpulse – Progress & Handoff Log

## Project Goal

Private AI FinOps + shadow-AI control plane. Meter tokens, attribute spend, enforce budget/data policy at a self-hosted gateway, export audit packs for CFO and CISO. Target: strong product + early traction → $1B+ exit path within ~12 months (AI FinOps / TRiSM adjacency).

## Current Status (Session 7 — 2026-09-16)

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

## Next Up (highest priority)

1. **Session 8:** Optional operator live proof against a real provider using a **rotated** key **outside git/chat**. Demo remains mock-default. Or SQLite ledger option if live proof stays blocked.
2. Streaming remains later.
3. Do not start bulk buyer outreach until one recorded live-upstream proof exists.

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

- Session 7: per-team sliding-window RPM. File + env. In-process only. Evaluated after model policy, before budget. `rpm: 0` hard-blocks. Pilot copy lives in `LANDING.md`. No outreach until live-upstream proof.

## Handoff for next session

Session 7 ships per-team rate limits and landing copy. Next: live upstream proof with a rotated key outside chat, or SQLite ledger. Never paste provider keys into chat.

```bash
npm install
npm test
npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# open http://127.0.0.1:8788/ and paste the token
```
