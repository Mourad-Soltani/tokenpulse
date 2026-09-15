# Tokenpulse — AI spend and policy, on your loopback

Enterprises already bought models. They did not buy control.

Tokenpulse is a self-hosted OpenAI-compatible gateway that meters tokens, attributes spend to teams and apps, and blocks requests that violate budget, model, rate, or sensitive-payload policy. Every decision lands in an append-only ledger CFOs and CISOs can export.

## Who it is for

- Platform / FinOps teams watching LLM invoices climb without attribution
- Security teams who cannot answer what prompts left the building
- Operators who need a mock-first demo today and live upstream when keys stay in env

## What a pilot looks like

1. `npm install && npm test && npm run demo` (no secrets)
2. Point one internal app at `http://127.0.0.1:8788/v1` with `X-Tokenpulse-Team`
3. Open `/dashboard` for spend + blocked events
4. Optional live provider: set `OPENAI_API_KEY` or `XAI_API_KEY` locally — never in git

## Non-goals for the pilot

Streaming, multi-tenant SaaS, replacing workflow orchestrators.

Contact: repository maintainer on GitHub (`Mourad-Soltani/tokenpulse`).
