# Outreach sequences (high-signal, non-bulk)

**Rules**
- Max ~10 personalized emails per wave. No blasts.
- Send only after `DEMO.md` recording exists (`SALE.md` checklist).
- Never paste API keys, PATs, or customer data.
- Prefer warm paths (shared connection, prior interaction). Cold email stays short.

---

## Sequence A — Strategic corp dev / AI security (Tier A)

### Email 1 — Opener (≤120 words)

**Subject:** Self-hosted AI spend + policy gateway (FinOps / CISO packs)

Hi {{Name}},

I built **Tokenpulse** — a self-hosted OpenAI-compatible gateway that meters tokens, attributes spend to team/app, and **blocks** requests that break budget, model, rate, or sensitive-payload policy before they hit the provider. Decisions land in a hash-chained ledger with export packs for CFO and CISO.

It is deliberately narrow: not an agent orchestrator, not multi-tenant SaaS. Mock-first demo; live upstream stays env-only.

Given {{Company}}’s work on {{AI security / observability / gateway}}, I wanted to offer a **15-minute technical walkthrough** (recorded demo + architecture) in case a self-hosted FinOps/policy slice is useful alongside your platform.

Happy to send the demo link or jump on a short call.

Best,  
Mourad Soltani  
https://github.com/Mourad-Soltani/tokenpulse

### Email 2 — Nudge (5–7 days later, only if no reply)

**Subject:** Re: Self-hosted AI spend + policy gateway

Hi {{Name}},

Quick follow-up in case this was buried. One concrete proof point: policy runs **before** egress (budget → 429, sensitive → 403, model deny → 403), with FinOps/security export packs and no raw prompts stored by default.

If useful, I can send a 3-minute recording. If not a fit, all good — thanks for reading.

Mourad

### Email 3 — Breakup (7 days later)

**Subject:** Closing the loop — Tokenpulse

Hi {{Name}},

I’ll close the loop on my side. If AI request-path spend control or CISO audit packs become a 2026 priority, the repo and demo remain available. Happy to reconnect later.

Mourad

---

## Sequence B — Platform / FinOps leader (enterprise design partner)

### Email 1

**Subject:** Attribute and cap LLM spend without another SaaS

Hi {{Name}},

If your teams ship against OpenAI-compatible APIs, you already know the invoice problem: tokens without team/app attribution and no hard stop when a budget is gone.

**Tokenpulse** is a loopback/self-hosted gateway drop-in: same `/v1/chat/completions` shape, plus daily/monthly caps, rate limits, model allow/deny, and exportable FinOps packs. Demo runs with zero provider keys.

Would a 20-minute pilot walkthrough for {{Team}} be useful?

Mourad Soltani  
https://github.com/Mourad-Soltani/tokenpulse

---

## Objection lines (paste-ready)

**“We could build this.”**  
You can. The product surface is gateway + multi-policy enforcement + hash-chained ledger + dual executive export packs + operator UI. Typical internal path is multiple quarters. This is a working vertical slice you can evaluate this week.

**“It’s just a GitHub repo.”**  
The repo is the distribution form. The asset is a running control plane with hard blocks and audit exports. Happy to stick to a recorded demo and sample packs — no slideware required.

**“How do you compare to Portkey / managed gateways?”**  
They optimize for managed scale and platform breadth. Tokenpulse optimizes for **self-hosted / env-key** deploy, **hard FinOps blocks**, and **CISO packs** without sending traffic to a third-party control plane by default.

**“What’s the price?”**  
For pilots: software is MIT-licensed in-repo; commercial terms for support, deploy help, or assignment are discussion-based after a technical fit call. Not leading with a vanity valuation.

---

## Do not send

- Mass BCC lists  
- Claims of production scale you do not have  
- “$1B outcome” language  
- Anything that includes secrets or unredacted customer prompts  
