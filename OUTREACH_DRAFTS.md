# Personalized outreach drafts (Session 69)

**Status:** Ready for operator personalization. **Do not send** until a recorded `DEMO.md` (mock Railway or local) exists and is linked or attached. Max ~10 total across all waves. No bulk.

Fill `{{Name}}` from LinkedIn / company site. Prefer corp-dev, product, or AI-security engineering contacts.

---

## Palo Alto Networks (Prisma AIRS / Portkey adjacency)

**Subject:** Sovereign FinOps-hard complement for Prisma AIRS AI Gateway

Hi {{Name}},

Tokenpulse is a self-hosted OpenAI-compatible gateway that meters tokens, attributes spend to team/app, and hard-blocks requests that violate budget, model, rate, or sensitive-payload policy before they leave the network. Decisions go into a hash-chained ledger with FinOps and CISO export packs.

It is deliberately narrow (not multi-tenant SaaS, not an agent orchestrator). Given the Portkey close (May 2026) and Prisma AIRS AI Gateway GA (July 2026), a sovereign / air-gapped FinOps-hard slice may be useful alongside the managed gateway — for customers who cannot send traffic to a third-party control plane or who need strict budget blocks + audit packs that travel with the data.

I can send a 3-minute mock demo recording (no keys) or jump on a short technical call. Repo: https://github.com/Mourad-Soltani/tokenpulse

Best,  
Mourad Soltani

---

## Cisco / Splunk (agent observability adjacency)

**Subject:** Request-path meter + budget block next to Splunk Tokenomics / Galileo

Hi {{Name}},

Tokenpulse sits on the request path of OpenAI-compatible LLM traffic: it meters tokens, attributes spend to team/app, and blocks (budget / model / rate / sensitive) before egress. The ledger is hash-chained and exports FinOps + security packs.

Splunk .conf26 messaging (“tokens are the new currency”) plus Galileo agent observability covers quality and guardrails; this fills the hard cost-control and append-only audit gap for the actual model API calls. Self-hosted, mock-first demo, no raw prompts stored by default.

Happy to share a short recording or architecture walkthrough if a FinOps-hard control plane is on the 2026 roadmap.

Mourad Soltani  
https://github.com/Mourad-Soltani/tokenpulse

---

## CrowdStrike (AI gateway / agentic security)

**Subject:** Lightweight self-hosted complement for Falcon Guardian AI Gateway

Hi {{Name}},

Tokenpulse is a small self-hosted OpenAI-compatible proxy that enforces budget, model allow/deny, rate, and sensitive-payload policy before any call reaches the provider, then writes a hash-chained usage event. Export packs go to CFO (FinOps) and CISO (blocked events + policy hits).

Falcon Guardian’s AI Gateway + Kill Switch (Nov 2026) covers endpoint + centralized inspect/enforce. This can be a lightweight sovereign complement for customers who want hard budget/sensitive blocks and an append-only ledger that stays inside their network. Demo runs with zero provider keys.

I can send the recording or a technical overview. Repo: https://github.com/Mourad-Soltani/tokenpulse

Best,  
Mourad Soltani

---

## Notes for operator

- Replace {{Name}} and optionally tweak the “given your work” sentence with a specific public product name or blog post.
- Attach or link the DEMO recording only after it exists.
- Follow the nudge / breakup timing in `OUTREACH.md` if no reply.
- Never include secrets. Never claim production scale or $1B outcomes.


## Operator helper (Session 110)

After seeding or running traffic, generate a paste-ready paragraph with current numbers:

```bash
TOKENPULSE_LEDGER_DIR=data/ledger-seed npx tsx src/cli.ts --outreach-snippet
# or: npm run outreach-snippet
```

Copy the `body` field into the personalized drafts above. Still do not send until the DEMO.md recording exists.

## Session 112 personalization hooks

Use the public product names above (Prisma AIRS AI Gateway, Splunk Tokenomics / Galileo, Falcon Guardian AI Gateway) in the opening sentence. Still do not send until a DEMO.md recording exists. Numbers can be filled from `--outreach-snippet` / `--buyer-brief` after seeding.
