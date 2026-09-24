# Tokenpulse — One-page teaser

**Private AI FinOps + policy control plane**  
Self-hosted · OpenAI-compatible · Built for CFO and CISO

---

### The problem

Enterprises bought models. They did not buy control.

- LLM invoices rise with no team or app attribution  
- Shadow AI runs outside IT; CISOs cannot say what left the building  
- Budgets are soft until finance sees the card bill  

### The product

**Tokenpulse** is a self-hosted gateway in the request path. Apps point `baseURL` at Tokenpulse instead of the provider.

| Before egress | After every call |
|---------------|------------------|
| Budget / rate / model / size policy | Token meter + estimated USD |
| Sensitive-payload heuristics | Team + app attribution |
| Allow or hard block | Hash-chained append-only ledger |

**Exports:** FinOps pack for spend · Security pack for blocks and policy hits  
**Demo:** `npm run demo` — zero provider keys · Live upstream stays in your env only  

### Why it is not “just a proxy”

Hard **blocks** (not only logs). Executive **export packs**. **No raw prompts** stored by default. Loopback-first for pilots; MIT-licensed TypeScript you can diligence in a day.

### Who cares

- **FinOps / platform** — attribute and cap spend by team and app  
- **CISO / security** — policy before egress + audit trail  
- **Strategic buyers** — AI gateway and agent-security platforms consolidating control-plane pieces  

### Proof in minutes

```bash
npm install && npm test && npm run demo
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
# dashboard → http://127.0.0.1:8788/
```

### Ask

Technical walkthrough or design-partner pilot. Commercial terms after fit — not a vanity valuation pitch.

**Repo:** https://github.com/Mourad-Soltani/tokenpulse  
**Contact:** Mourad Soltani (repository maintainer)

---

*Not a chatbot. Not a model. A control plane for AI spend and policy.*
