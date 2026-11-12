# Tokenpulse — Sale readiness pack

**Status:** Product MVP complete (Session 23+). Sale materials prepared (Session 24). Market comps + valuation bands refreshed (Session 118 — Nov 12 2026).  
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
| Executive artifacts | `tokenpulse-finops-v1` + `tokenpulse-security-v1` packs (include policy ROI + annual projection) |
| Operator UI | Loopback dashboard: spend, blocks, budget/rate/limit status, Policy ROI, annual projection |
| Safe demo | Secret-free `npm run demo`; live keys env-only |

Internal rebuild estimate for the same surface: **multiple engineering quarters** plus security review. Purchase is time-to-control-plane, not line count.

## Positioning (use in conversations)

- **Wedge:** FinOps + policy + audit on a self-hosted OpenAI-compatible gateway — not generic LLMOps tracing, not multi-agent orchestration.
- **Buyers of pain:** Platform/FinOps (unattributed LLM bills), CISO (what left the building), operators who need mock-first then live env keys.
- **Differentiation vs LiteLLM / pure proxies:** hard budget blocks, CISO pack, hash chain, team/app attribution, sensitive-payload block without storing prompts.
- **Differentiation vs managed gateways:** self-host / loopback-first; no third party in the data path by default.
- **Differentiation vs Portkey-in-Prisma AIRS:** sovereign / air-gap deploy, FinOps-hard blocks, CFO/CISO audit packs, key lifecycle — pitch **adjacent**, never “replace Portkey.”

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

- [ ] Personalize 5–10 emails from `OUTREACH.md` / `OUTREACH_DRAFTS.md` (no bulk blasts)
- [ ] Attach or link demo recording only after NDA / serious reply if preferred

## Valuation posture (Session 118 — public comps, Nov 12 2026)

Independent market read (bypassed internal prior bands). Sources: Portkey SEC/press, Helicone–Mintlify, Langfuse–ClickHouse, OpenRouter–Stripe (outlier), LiteLLM scale signals, Gartner AI FinOps EMQ, LLM gateway market reports.

**Category signal:**
- AI FinOps tools: ~$3.7B (2026) → $10B by 2030 (~31% CAGR, Gartner).
- LLM gateway market: ~$820M (2025) → $7.3B by 2034 (~27.5% CAGR).
- AI observability: ~$1.25–1.78B (2025–26) → ~$13.9B by 2036 (~23% CAGR).
- Buyers actively consolidating control-plane and spend-visibility assets (cyber, data platforms, cloud).

**Public comps:**

| Deal | Approx | Relevance |
|------|--------|-----------|
| Portkey → Palo Alto Networks (closed May 29, 2026) | **$120–140M** (most sources ~$140M; prior internal note used $117M SEC figure) | Closest peer: AI gateway + control plane. ~$18M raised; scale + customers commanded the price. |
| Helicone → Mintlify (March 2026) | Low / mid tens $M band (undisclosed) | Observability/proxy; maintenance mode — lower strategic gravity. |
| Langfuse → ClickHouse (Jan 2026) | Undisclosed (inside ClickHouse $15B Series D context) | OSS traction + distribution matter. |
| OpenRouter → Stripe (closed Nov 2026) | **~$7.5–8B** | Outlier: massive token volume + revenue scale. Not a fair multiple for early product. |
| LiteLLM (BerriAI) | Seed-stage; reported ~$7M ARR (unverified), ~$1.6–2.1M raised | High adoption open-source gateway; still early. |

**Tokenpulse bands (pre-revenue, pre-demo recording — Session 118):**

| Band | Range | Condition |
|------|-------|-----------|
| **Floor** | **$3–8M** | Zero traction. Pure code/IP/asset value to a strategic. |
| **Base** | **$15–40M** | Complete MVP, demo-ready, early or no revenue. Fair market for category timing. |
| **Strategic** | **$60–150M** | Motivated buyer (cyber / data / cloud platform) + pilot signal or early logos. Portkey-like fit. Upper end needs commercial proof. |

**Current mark (Nov 12 2026):** base band midpoint is the honest working number (~$20–30M). Floor is the walk-away / asset-only floor. Strategic upper band is only reachable with demo recording + pilots/revenue.

Do **not** lead with a $1B story. Lead with **control plane gap**, **time-to-deploy**, **self-host / audit integrity**, and **adjacent value to Portkey/Prisma**. Traction moves price far more than more features. OpenRouter is not a comparable for this stage.

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
