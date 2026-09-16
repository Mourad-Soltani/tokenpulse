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

## What works today (Session 8)

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
| Rate limits | Live (per-team RPM) |
| Sensitive-payload heuristics | Live |
| SQLite ledger option | Live (`TOKENPULSE_LEDGER_DRIVER=sqlite`) |

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
