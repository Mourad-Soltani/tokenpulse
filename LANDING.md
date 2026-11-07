# Tokenpulse — Private AI FinOps + shadow-AI control plane

**One line:** Self-hosted OpenAI-compatible gateway that meters tokens, attributes spend, enforces budget/data policy before egress, and exports audit packs for CFO and CISO.

Enterprises already bought models. They did not buy control. Tokenpulse is the control plane.

---

## The problem

- LLM invoices climb with no team/app attribution
- Shadow AI: tools and prompts leave the building without IT oversight
- CFOs cannot answer “who spent what”; CISOs cannot answer “what left”
- 98% of FinOps teams now manage AI spend — 73% of AI projects still overrun budget

## The product

| Layer | What it does |
|-------|----------------|
| **Gateway** | OpenAI-compatible proxy (chat, embeddings, models list, SSE). Point `baseURL` at Tokenpulse. |
| **Meter** | Tokens, model, team, app, latency, estimated USD — every request |
| **Policy** | Budget (daily/monthly, team/app), rate limits, model allow/deny, remap, size caps, sensitive-payload block — **before** provider egress |
| **Ledger** | Append-only usage events; optional SHA-256 hash chain; no raw prompts by default |
| **Export** | FinOps pack + CISO/security pack (JSON/CSV) |
| **Operator** | Loopback admin API + dashboard: spend rankings, blocked impact / Policy ROI, burn-rate, alerts, key lifecycle |

**Self-host first.** Loopback default. Mock upstream for secret-free demos. Live keys stay in env only.

## Who it is for

- **Platform / FinOps** — unattributed LLM bills, budget hard-blocks
- **CISO / security** — policy before egress, sensitive payload heuristics, audit chain
- **Operators** — mock-first today; live upstream when keys never leave the shell

## Pilot in 15 minutes

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# open http://127.0.0.1:8788/ — paste token
```

1. Point one internal app at `http://127.0.0.1:8788/v1` with `X-Tokenpulse-Team` / `X-Tokenpulse-App`
2. Watch spend and blocks on `/dashboard`
3. Optional live: set `OPENAI_API_KEY` or `XAI_API_KEY` in the local shell only — never in git

Paid pilot path: see `PILOT.md` ($15k / 30 days + reference capture).

## Positioning (not these)

| Not this | Tokenpulse is |
|----------|----------------|
| Chatbot or model lab | Control plane for spend + policy |
| Pure observability (Langfuse-style) | Hard budget/rate blocks + CISO packs |
| Multi-agent workflow OS | Gateway + ledger in the request path |
| Managed global SaaS gateway | Self-host / VPC / air-gap first |

Adjacent to Portkey-in-Prisma AIRS: sovereign deploy, FinOps-hard enforcement, CFO/CISO artifacts — not a replacement pitch.

## Proof & next step

- Repo: [github.com/Mourad-Soltani/tokenpulse](https://github.com/Mourad-Soltani/tokenpulse)
- Recording script: `DEMO.md` · Diligence: `PROOF.md` · Sale posture: `SALE.md`

**Contact:** repository maintainer — GitHub `Mourad-Soltani/tokenpulse`
