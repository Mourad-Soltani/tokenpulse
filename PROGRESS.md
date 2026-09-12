# Tokenpulse – Progress & Handoff Log

## Project Goal

Private AI FinOps + shadow-AI control plane. Meter tokens, attribute spend, enforce budget/data policy at a self-hosted gateway, export audit packs for CFO and CISO. Target: strong product + early traction → $1B+ exit path within ~12 months (AI FinOps / TRiSM adjacency).

## Current Status (Session 1 — 2026-09-13)

- [x] Repository created (`Mourad-Soltani/tokenpulse`)
- [x] Bootstrap: README, ARCHITECTURE, ROADMAP, PROGRESS, package.json, tsconfig, gitignore
- [x] Successor to closed Aether Forge daily-builder loop (client handover)
- [x] OpenAI-compatible gateway skeleton (`POST /v1/chat/completions`)
- [x] Mock upstream when `TOKENPULSE_MOCK_UPSTREAM=1`
- [x] Usage ledger JSONL (`data/ledger/<day>.jsonl`) + cost estimate table
- [x] Team/app attribution via `X-Tokenpulse-Team` / `X-Tokenpulse-App`
- [x] Secret-free `npm run demo`
- [x] Tests (`pricing`, `ledger`, `gateway`) + CLI `--summary` / `--export`
- [ ] Budget policy (daily cap per team)
- [ ] Live upstream forward
- [ ] Minimal dashboard

## Next Up (highest priority)

1. **Session 2:** Daily budget check per team (`data/budgets.json`) → block with structured error + ledger `decision: block` when exceeded.
2. Live upstream forward when mock is off (`OPENAI_API_KEY` / `XAI_API_KEY` / `TOKENPULSE_UPSTREAM_*`). Keys env-only; never in chat.
3. Model allow/deny list (still after budget).
4. Dashboard only after meter + budget.

## Decisions So Far

- Stack: TypeScript (Node 20+), Zod, Node `http` for gateway.
- Self-host first; loopback default (`127.0.0.1:8788`).
- Raw prompts **not** stored by default. Ledger stores `requestHash` only.
- Distinct from Aether Forge: no workflow orchestrator; focus is gateway + ledger + policy.
- Pricing table is approximate (static map for common models); operators can override via config later.
- No secrets in git. Upstream keys env-only.
- Session 1: live upstream returns 501 until Session 2+. Demo and tests use mock only.
- Gateway token optional; if `TOKENPULSE_GATEWAY_TOKEN` is set, require `Authorization: Bearer` or `X-Tokenpulse-Token`. `/health` stays open.
- Streaming rejected in v0.1.

## Handoff for next session

Session 1 ships the mockable chat gateway + JSONL ledger + attribution headers + secret-free demo. Next slice is daily team budget enforcement.

```bash
npm install
npm test
npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# curl http://127.0.0.1:8788/health
# curl -X POST http://127.0.0.1:8788/v1/chat/completions \
#   -H "Authorization: Bearer dev-local-token" \
#   -H "X-Tokenpulse-Team: eng" -H "X-Tokenpulse-App: bot" \
#   -H "Content-Type: application/json" \
#   -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}'
npm run summary
```
