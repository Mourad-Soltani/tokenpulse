# Strategic buyer map (Tokenpulse)

Research snapshot for personalized outreach. Prefer **corporate development / AI security / platform product** contacts over generic info@.  
Do **not** send bulk email. Wait until live demo proof exists (`SALE.md`).

## Tier A — highest fit (gateway / AI security control plane)

| Account | Why they care | Angle | Note |
|---------|---------------|-------|------|
| **Palo Alto Networks** (Prisma AIRS) | Bought Portkey ($120–140M, closed May 2026) as AI Gateway core; still consolidating AI control plane | Self-hosted / air-gap FinOps+policy complement; spend attribution + CISO packs; not competing as global SaaS gateway | They already own a gateway — pitch **adjacent** (sovereign deploy, FinOps-hard blocks) or talent+code acceleration, not “replace Portkey” |
| **Cisco / Splunk** | Galileo → agent observability; Astrix / WideField → agent identity & telemetry; building agent trust layer | Request-path **meter + budget block + audit chain** for model API traffic; FinOps gap next to eval/guardrails | Emphasize cost control + append-only audit, not eval scores |
| **CrowdStrike** | Public push into agentic AI security; AI gateway for model/MCP traffic called out as coming | Lightweight self-hosted gateway with policy-before-egress and hash-chained ledger for Falcon-adjacent runtime story | Keep technical, SOC/CISO language |

## Recent market signals (Session 112 — Nov 2026)

Public announcements used to tighten outreach angles. No product change.

- **Palo Alto Networks / Prisma AIRS**: Portkey closed May 29, 2026. Prisma AIRS AI Gateway GA announced July 16, 2026 (sub-ms routing, 68T+ tokens/month claim). Nov 2026 docs show continued runtime, skill-security, and K8s IP-tag work. Pitch remains **adjacent** (sovereign / air-gap FinOps-hard blocks + CISO packs), not a managed-gateway replacement.
- **Cisco / Splunk**: Galileo (May 2026), Astrix, WideField acquired. .conf26 (Sep 2026) theme “tokens are the new currency / control is the new moat”; Tokenomics + agent observability + on-prem AI POD messaging. Strong fit for request-path meter + budget block + hash-chained audit next to eval/guardrails.
- **CrowdStrike**: Falcon Guardian AI Gateway + AI Kill Switch announced Nov 3, 2026 (routes AI traffic, inspects prompts/responses, monitors usage, enforces policy; endpoint + gateway). Pitch lightweight self-hosted complement for customers who want hard budget/sensitive blocks and append-only ledger without the full Falcon agent surface.

Use these public product names in the first sentence of personalized emails. Still wait for DEMO.md recording before any send.


## Tier B — strong adjacent (observability / cloud / identity)

| Account | Why they care | Angle |
|---------|---------------|-------|
| **Datadog / New Relic / Elastic** | LLM/obs expansion; customers ask for cost + policy signals | Export packs + gateway metrics as a productized source |
| **Microsoft / Azure AI** | Enterprise AI governance; many customers need on-prem path | Self-host OpenAI-compatible control plane for regulated tenants |
| **Google Cloud / AWS** | Marketplace + enterprise AI governance narratives | Same; sovereign proxy in customer VPC |
| **Okta / cyber identity vendors** | Non-human / agent identity adjacency | Team/app attribution headers as weak identity until SSO mapping exists |
| **Zscaler / Netskope** | Inline policy on SaaS; AI traffic is the new category | Sensitive-payload + model policy before egress |

## Tier C — product / distribution partners (not pure acquirers)

| Account | Why |
|---------|-----|
| TrueFoundry, other K8s AI platforms | Gateway feature gap for FinOps-hard enforcement |
| FinOps tool vendors (cloud cost) | LLM line item is the blind spot |
| Boutique AI governance consultancies | Pilot delivery partner, not buyer |

## Who not to prioritize first

- Pure model labs shopping for training data infra  
- “Another Langfuse clone” VCs without enterprise distribution  
- Bulk LinkedIn sequences to random SDRs  

## Public comps (diligence context — Session 108, Nov 2026)

| Deal | Approx | Relevance |
|------|--------|-----------|
| Portkey → Palo Alto Networks (closed May 2026) | **$120–140M** (SEC / press) | Closest peer AI gateway + control plane; ~$18M raised; scale + customers commanded the price |
| Helicone → Mintlify (early 2026) | Low / mid tens $M band | Observability/proxy without platform gravity clears less |
| Langfuse → ClickHouse (Jan 2026) | Raised ~$4–4.5M pre-deal | OSS traction + distribution matter |

Tokenpulse today is **earlier than Portkey-at-exit** (pre-revenue, pre-demo recording). Outreach should invite a **technical look + pilot**, not an auction narrative. Internal valuation bands live in `SALE.md` (Session 108).

## Diligence packet (when asked)

1. Repo + `ARCHITECTURE.md`  
2. Recorded `DEMO.md` (mock + optional live)  
3. Sample FinOps + security JSON/CSV exports  
4. Security notes: no secrets in git, no raw prompts by default, loopback default, gateway token  
5. Test suite green (`npm test`)  
