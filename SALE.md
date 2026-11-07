# Tokenpulse — Sale readiness pack

**Status:** Product MVP complete (Session 23+). Sale materials prepared (Session 24). Market comps refreshed (Session 108 — Nov 2026).  
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
| Operator UI | Loopback dashboard: spend, blocks, budget/rate/limit status, Policy ROI |
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

## Valuation posture (Session 108 — real market, Nov 2026)

**Category signal (external):**
- 98% of FinOps teams now manage AI spend (was 31% in 2024). 73% of AI projects still overrun budget.
- Cloud FinOps software ~$15–17B (2025/26) → $27–33B by 2030–31.
- Narrow AI FinOps / inference cost optimization: ~$0.7B (2026) → $22.5B by 2036 (high-40s CAGR).

**Public comps:**

| Deal | Approx | Relevance |
|------|--------|-----------|
| Portkey → Palo Alto Networks (closed May 2026) | **$120–140M** (SEC / press) | Closest peer: AI gateway + control plane. Raised ~$18M; scale + customers commanded the price. |
| Helicone → Mintlify (early 2026) | Low / mid tens $M band | Observability/proxy without platform gravity clears less. |
| Langfuse → ClickHouse (Jan 2026) | Raised ~$4–4.5M pre-deal | OSS traction + distribution matter. |

**Tokenpulse internal bands (pre-revenue, pre-demo recording):**

| Scenario | Range | Condition |
|----------|-------|-----------|
| Floor (tech / asset sale today) | **$1–4M** | Code + architecture + self-host story only |
| Base (demo + 2–3 pilot LOIs) | **$8–25M** | Proves private FinOps + policy works |
| Upside ($0.5–2M ARR + traction) | **$40–100M+** | Default self-host / regulated alternative |
| Strategic stretch | **$80–150M** | Large platform treats it as missing private control plane |

**Current mark (Nov 2026):** low single-digit $M. Do **not** lead with a $1B story. Lead with **control plane gap**, **time-to-deploy**, and **adjacent value to Portkey/Prisma**. Traction (pilots + recording) moves price far more than more features.

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
