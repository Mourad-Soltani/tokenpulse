# Tokenpulse – Progress & Handoff Log

## Project Goal

Private AI FinOps + shadow-AI control plane. Meter tokens, attribute spend, enforce budget/data policy at a self-hosted gateway, export audit packs for CFO and CISO. Target: strong product + early traction → $1B+ exit path within ~12 months (AI FinOps / TRiSM adjacency).

## Current Status (Session 0 — 2026-09-12)

- [x] Repository created (`Mourad-Soltani/tokenpulse`)
- [x] Bootstrap: README, ARCHITECTURE, ROADMAP, PROGRESS, package.json, tsconfig, gitignore
- [x] Successor to closed Aether Forge daily-builder loop (client handover)
- [ ] OpenAI-compatible gateway skeleton (meter + forward or mock)
- [ ] Usage ledger (JSONL) + cost estimate table
- [ ] Budget policy (daily cap per team)
- [ ] Secret-free `npm run demo`
- [ ] Tests + CLI summary
- [ ] Minimal dashboard

## Next Up (highest priority)

1. **Session 1:** Gateway skeleton — accept OpenAI-compatible `/v1/chat/completions`, mock upstream when `TOKENPULSE_MOCK_UPSTREAM=1`, append `UsageEvent` to JSONL ledger, return a valid chat response shape.
2. Team/app attribution via `X-Tokenpulse-Team` / `X-Tokenpulse-App` headers.
3. Daily budget check → block with structured error when exceeded.
4. CLI `--summary` and `--export` over the ledger.
5. Only after meter+budget work: dashboard and sensitive-payload heuristics.

## Decisions So Far

- Stack: TypeScript (Node 20+), Zod, Node `http` for gateway.
- Self-host first; loopback default.
- Raw prompts **not** stored by default.
- Distinct from Aether Forge: no workflow orchestrator; focus is gateway + ledger + policy.
- Pricing table is approximate (static map for common models); operators can override via config later.
- No secrets in git. Upstream keys env-only.

## Handoff for next session

Session 0 is bootstrap only. Implement the mockable OpenAI-compatible gateway + JSONL ledger first. Keep increments small and shippable. Do not paste provider API keys into chat or commits.

```bash
npm install
# after Session 1:
# TOKENPULSE_MOCK_UPSTREAM=1 npm run start:gateway
# npm test
# npm run demo
```
