# Tokenpulse — Sale readiness pack

**Status:** Product MVP complete (Session 23). Sale materials prepared (Session 24).  
**Gates:** Machine proof closed (`PROOF.md` + `proof/`). Operator screen recording still required before outbound. First commercial reference via `PILOT.md` (not fabricated).

## One-liner

Self-hosted OpenAI-compatible control plane for AI **spend and policy**: meter tokens, attribute to team/app, enforce budget/rate/model/data rules before egress, export FinOps and CISO audit packs.

## Why not “just a repo”

Buyers who only see GitHub will lowball. The asset is a **running vertical product**:

| Capability | Proof |
|------------|--------|
| Gateway in the request path | Chat, embeddings, models list, SSE streaming |
| Spend control | Team + app daily/monthly USD caps; block + ledger |
| Policy before egress | Model allow/deny, RPM, sensitive heuristics, size caps |
| Audit integrity | SHA-256 hash-chained usage events; `--verify-ledger` |
| Executive artifacts | `tokenpulse-finops-v1` + `tokenpulse-security-v1` packs |
| Operator UI | Loopback dashboard: spend, blocks, budget/rate/limit status |
| Safe demo | Secret-free `npm run demo`; live keys env-only |

Internal rebuild estimate for the same surface: **multiple engineering quarters** plus security review. Purchase is time-to-control-plane, not line count.

## Positioning (use in conversations)

- **Wedge:** FinOps + policy + audit on a self-hosted OpenAI-compatible gateway — not generic LLMOps tracing, not multi-agent orchestration.
- **Buyers of pain:** Platform/FinOps (unattributed LLM bills), CISO (what left the building), operators who need mock-first then live env keys.
- **Differentiation vs LiteLLM / pure proxies:** hard budget blocks, CISO pack, hash chain, team/app attribution, sensitive-payload block without storing prompts.
- **Differentiation vs managed gateways:** self-host / loopback-first; no third party in the data path by default.

## Complete checklist

### Product (done)

- [x] Gateway + ledger + policy + admin + exports
- [x] Secret-free demo path
- [x] Packaging docs (`LANDING.md`, `DEMO.md`, this file)

### Machine proof (Session 30)

- [x] Secret-free demo + tests green
- [x] Committed sample packs under `proof/` (FinOps, security, chain, summary)
- [x] Diligence map: `PROOF.md`

### Operator (your machine — not automation)

- [ ] Screen-record `DEMO.md` / `PROOF.md` §B (no keys on camera) — **only remaining proof gap**
- [ ] Optional: live upstream once with rotated key in **local shell only**
- [ ] Optional: 30s clip of budget/sensitive **block** + FinOps export open in editor

### Commercial reference path (Session 30)

- [x] Pilot offer + reference capture process: `PILOT.md` ($15k / 30 days)
- [ ] First pilot signed / started
- [ ] Written quote → fill References table in `PILOT.md`

### Outreach (after operator recording; pilot can run in parallel)

- [ ] Personalize 5–10 emails from `OUTREACH.md` (no bulk blasts)
- [ ] Attach or link demo recording only after NDA / serious reply if preferred

## Valuation posture (internal)

At complete + proof, no revenue: discuss as **early strategic asset** (rough private band low-single-digit $M if interest is real). Do not lead with a $1B story. Lead with **control plane gap** and **time-to-deploy**. Traction (pilots) moves price more than more features.

## What we are not selling

- Multi-tenant SaaS
- Replacement for PANW Prisma AIRS at global token scale
- Guaranteed $100M+ outcome without customers

## Repo entry points

| Doc | Role |
|-----|------|
| `LANDING.md` | Pilot one-pager |
| `DEMO.md` | Recording script |
| `BUYERS.md` | Strategic target map |
| `OUTREACH.md` | Email sequences (high-signal, non-bulk) |
| `ARCHITECTURE.md` | Technical depth for diligence |
| `PROGRESS.md` | Build history / handoff |
| `PROOF.md` / `proof/` | Diligence reproduction + sample packs |
| `PILOT.md` | Paid pilot + reference capture |
