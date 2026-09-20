# Roadmap (public)

## v0.1 — FinOps gateway MVP (current)

- [x] OpenAI-compatible proxy (chat completions, mock upstream)
- [x] Token metering + estimated USD cost table
- [x] Team/app attribution headers
- [x] Budget policy (daily cap per team)
- [x] Block decision in ledger
- [x] Secret-free demo (mock upstream)
- [x] CLI: ledger summary + export
- [x] Live provider forward (env keys; mock remains default demo)
- [x] Model allow/deny lists
- [x] Loopback admin API (`GET /v1/admin/summary`, `GET /v1/admin/events`)
- [x] Minimal dashboard (`GET /`)
- [x] Sensitive-payload heuristics (regex + simple detectors)
- [x] Per-team request rate limits
- [x] Pilot landing copy (`LANDING.md`)
- [x] SQLite ledger option
- [x] FinOps + CISO export packs
- [x] Embeddings proxy (`POST /v1/embeddings`)
- [x] Per-request prompt / max_tokens caps
- [x] Monthly team spend caps
- [x] Streaming chat completions (SSE)
- [x] Hash-chained usage ledger (`--verify-ledger`)
- [x] Operator notes on the ledger (`--note` / `POST /v1/admin/note`)
- [x] OpenAI-compatible models list (`GET /v1/models`, policy-filtered)
- [x] Spend rollup by app (`byApp` on summary / dashboard / FinOps pack)
- [x] Secret-free demo walkthrough (`DEMO.md`)

## Next

- [ ] Recorded live-upstream proof (operator key outside git/chat)
- [ ] Record `DEMO.md` locally (packaging copy is in-repo)

## Later

- Shadow-AI discovery signals
- Multi-upstream routing / fallback
- SSO-backed team mapping
- Cloud single-tenant deploy

See `ARCHITECTURE.md` and `PROGRESS.md`.
