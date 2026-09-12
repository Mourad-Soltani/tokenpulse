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

## What works today (Session 0)

| Capability | Status |
|------------|--------|
| Repo + architecture + progress log | Live |
| OpenAI-compatible gateway (meter + forward) | Next |
| Budget / rate policy engine | Planned |
| Sensitive-payload heuristics (block/redact) | Planned |
| Usage ledger + export | Planned |
| Local dashboard (spend by team/model) | Planned |
| Secret-free demo path | Planned |

## Quick start (after Session 1+)

```bash
npm install
npm test
npm run demo
```

## Security notes

- No secrets in git. Provider keys are env-only at proxy time.
- Default bind is loopback.
- Audit and usage ledgers are append-only.

## License

MIT

## Related

Successor to the Aether Forge daily-builder loop (workflow HITL/orchestration). Tokenpulse focuses on **spend, discovery, and policy** rather than multi-step agent workflows.
