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
- [x] Per-app daily/monthly spend caps
- [x] Per-app request rate limits
- [x] Per-app prompt / max_tokens caps
- [x] Budget remaining / warn status on admin summary
- [x] Rate remaining / warn status on admin summary
- [x] Request-size cap status on admin summary
- [x] Multi-upstream fallback (`TOKENPULSE_UPSTREAM_FALLBACK_*`)
- [x] Model remap (`TOKENPULSE_MODEL_REMAP` / `remap` in models file)
- [x] Weighted multi-upstream first hop (`TOKENPULSE_UPSTREAM_WEIGHTS`)

## Sale readiness

- [x] Positioning + checklist (`SALE.md`)
- [x] Strategic buyer map (`BUYERS.md`)
- [x] Outreach sequences + objections (`OUTREACH.md`)

## Next (operator)

- [ ] Recorded live-upstream proof (operator key outside git/chat)
- [ ] Record `DEMO.md` locally
- [ ] Personalized outreach (after recordings; non-bulk)

## Later

- Shadow-AI discovery signals
- [x] Multi-upstream weighted routing
- SSO-backed team mapping
- Cloud single-tenant deploy

See `ARCHITECTURE.md` and `PROGRESS.md`.
