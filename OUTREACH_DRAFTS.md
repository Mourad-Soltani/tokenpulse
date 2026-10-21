# Personalized outreach drafts (Session 69)

**Status:** Ready for operator personalization. **Do not send** until a recorded `DEMO.md` (mock Railway or local) exists and is linked or attached. Max ~10 total across all waves. No bulk.

Fill `{{Name}}` from LinkedIn / company site. Prefer corp-dev, product, or AI-security engineering contacts.

---

## Palo Alto Networks (Prisma AIRS / Portkey adjacency)

**Subject:** Self-hosted FinOps + policy complement for AI gateway traffic

Hi {{Name}},

Tokenpulse is a self-hosted OpenAI-compatible gateway that meters tokens, attributes spend to team/app, and hard-blocks requests that violate budget, model, rate, or sensitive-payload policy before they leave the network. Decisions go into a hash-chained ledger with FinOps and CISO export packs.

It is deliberately narrow (not multi-tenant SaaS, not an agent orchestrator). Given Palo Alto’s Portkey acquisition and Prisma AIRS work, a sovereign / air-gapped FinOps-hard slice may be useful alongside the managed gateway — for customers who cannot send traffic to a third-party control plane or who need strict budget blocks + audit packs.

I can send a 3-minute mock demo recording (no keys) or jump on a short technical call. Repo: https://github.com/Mourad-Soltani/tokenpulse

Best,  
Mourad Soltani

---

## Cisco / Splunk (agent observability adjacency)

**Subject:** Request-path meter + budget block + hash-chained audit for model APIs

Hi {{Name}},

Tokenpulse sits on the request path of OpenAI-compatible LLM traffic: it meters tokens, attributes spend to team/app, and blocks (budget / model / rate / sensitive) before egress. The ledger is hash-chained and exports FinOps + security packs.

Cisco’s Galileo / agent trust work covers observability and identity; this fills the hard cost-control and append-only audit gap for the actual model API calls. Self-hosted, mock-first demo, no raw prompts stored by default.

Happy to share a short recording or architecture walkthrough if a FinOps-hard control plane is on the 2026 roadmap.

Mourad Soltani  
https://github.com/Mourad-Soltani/tokenpulse

---

## CrowdStrike (AI gateway / agentic security)

**Subject:** Lightweight self-hosted AI gateway with policy-before-egress and audit chain

Hi {{Name}},

Tokenpulse is a small self-hosted OpenAI-compatible proxy that enforces budget, model allow/deny, rate, and sensitive-payload policy before any call reaches the provider, then writes a hash-chained usage event. Export packs go to CFO (FinOps) and CISO (blocked events + policy hits).

Given CrowdStrike’s public direction on agentic AI security and model/MCP gateways, this could be a lightweight runtime control for customers who want hard blocks and audit without a heavy managed plane. Demo runs with zero provider keys.

I can send the recording or a technical overview. Repo: https://github.com/Mourad-Soltani/tokenpulse

Best,  
Mourad Soltani

---

## Notes for operator

- Replace {{Name}} and optionally tweak the “given your work” sentence with a specific public product name or blog post.
- Attach or link the DEMO recording only after it exists.
- Follow the nudge / breakup timing in `OUTREACH.md` if no reply.
- Never include secrets. Never claim production scale or $1B outcomes.
