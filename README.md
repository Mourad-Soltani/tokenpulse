# Tokenpulse

**Private AI FinOps + shadow-AI control plane** for enterprises.

Meter every LLM token, attribute spend to teams and apps, enforce budget and data-egress policy at a self-hosted gateway, and export audit packs for CFO and CISO.

Not a chatbot. Not a model. A control plane for AI *spend and policy*.

## Why

Enterprises are losing control of AI cost and data:

- Most AI tools run without IT oversight (shadow AI).
- Token bills spike without attribution to team, feature, or customer.
- CISOs cannot answer “what left the building”; CFOs cannot answer “who spent what”.

Tokenpulse is the gateway + ledger layer: OpenAI-compatible proxy, policy checks before egress, append-only usage ledger, exportable FinOps and security packs.

## What works today (Session 23)

| Capability | Status |
|------------|--------|
| Repo + architecture + progress log | Live |
| OpenAI-compatible gateway (mock upstream) | Live |
| Live provider forward | Live (env keys; mock default) |
| Usage ledger + CLI summary/export | Live |
| Team/app attribution headers | Live |
| Secret-free demo path | Live |
| Daily team budget policy | Live |
| Model allow/deny | Live |
| Loopback admin API + dashboard | Live |
| Rate limits | Live (per-team + per-app RPM) |
| Sensitive-payload heuristics | Live |
| SQLite ledger option | Live (`TOKENPULSE_LEDGER_DRIVER=sqlite`) |
| FinOps + CISO export packs | Live (`--export-finops` / `--export-security`) |
| Embeddings proxy | Live (`POST /v1/embeddings`, same policy + ledger) |
| Per-request size limits | Live (team + app `maxPromptChars` / `max_tokens`; HTTP 413) |
| Monthly team spend caps | Live |
| Chat streaming (SSE) | Live |
| Hash-chained ledger | Live (`--verify-ledger`) |
| Operator notes | Live (`--note` / `POST /v1/admin/note`) |
| Models list | Live (`GET /v1/models`, filtered by allow/deny) |
| Per-app spend caps | Live |
| Per-app RPM | Live |
| Per-app size caps | Live |
| Budget / rate / size status | Live (admin summary + dashboard) |

## Quick start

```bash
npm install
npm test
npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# dashboard: http://127.0.0.1:8788/  (paste the same token)
```

## Security notes

- No secrets in git. Provider keys are env-only at proxy time.
- Default bind is loopback.
- Audit and usage ledgers are append-only.

## License

MIT

## Related

Successor to the Aether Forge daily-builder loop (workflow HITL/orchestration). Tokenpulse focuses on **spend, discovery, and policy** rather than multi-step agent workflows.

See `DEMO.md` for the secret-free recorded walkthrough and `LANDING.md` for pilot copy.
