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

## Next

- [ ] Sensitive-payload heuristics (regex + simple detectors)
- [ ] Streaming response support
- [ ] SQLite ledger option
- [ ] Pilot packaging + landing copy

## Later

- Shadow-AI discovery signals
- Multi-upstream routing / fallback
- SSO-backed team mapping
- Cloud single-tenant deploy

See `ARCHITECTURE.md` and `PROGRESS.md`.
