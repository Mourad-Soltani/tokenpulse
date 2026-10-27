# Tokenpulse demo walkthrough (secret-free)

For the full diligence checklist and committed sample packs, see **PROOF.md** and **proof/**.

Record this locally. Do not put provider keys in the recording or in git.

## 1. Install and test

```bash
npm install
npm test
```

All suites use mock upstream and temp ledger dirs.

## 2. Canonical demo

```bash
npm run demo
```

Expected: mock chat + embeddings + budget/rate/model/sensitive blocks + FinOps/CISO packs + `--verify-ledger` + operator note. Exit 0.

## 3. Dashboard (optional, two steps)

```bash
TOKENPULSE_MOCK_UPSTREAM=1 TOKENPULSE_GATEWAY_TOKEN=dev-local-token npm run start:gateway
```

Open `http://127.0.0.1:8788/`. Paste `dev-local-token`. Confirm KPIs, **By team**, **By app**, recent blocks, chain badge.

## 4. Attribution check

```bash
curl -s http://127.0.0.1:8788/v1/chat/completions \
  -H "authorization: Bearer dev-local-token" \
  -H "content-type: application/json" \
  -H "x-tokenpulse-team: finance" \
  -H "x-tokenpulse-app: close-bot" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}'
npx tsx src/cli.ts --summary
```

`byApp.close-bot` should increment. Notes stay at zero cost.

## 5. Live upstream (operator only — do not record keys)

Unset mock. Set `OPENAI_API_KEY` or `XAI_API_KEY` in the local shell only. Replay one chat. Confirm ledger `decision: allow` and cost > 0. Rotate any key that ever appeared in chat.

## Non-goals for the recording

Buyer outreach, production multi-tenant, storing raw prompts.

## 6. Observability (optional for recording)

After a few requests (allow + at least one policy block):

```bash
curl -s -H "Authorization: Bearer dev-local-token" http://127.0.0.1:8788/v1/admin/metrics
```

Show latency p95, upstream success rate, and alerts count.  
See `docs/observability.md` for a Prometheus scrape example and a basic Grafana dashboard JSON (`docs/grafana-tokenpulse.json`).

On a Railway public mock URL the same endpoint works with the runtime token. Generate traffic first so percentiles are non-zero.

## 7. Spend ranking (Session 68 — show in recording)

After traffic, the dashboard shows ranked tables:

- **Model spend** — top models by estimated USD
- **Team spend** — top teams by estimated USD  
- **App spend** — top apps by estimated USD

CLI equivalents: `--model-spend`, `--team-spend`, `--app-spend`.

These appear after the demo script has generated allow + block events. Useful for the recording to show “who is driving cost.”

## 8. Monthly burn-rate (Session 70 — show in recording)

After traffic with monthly caps configured, the dashboard shows a second projection table under Daily burn rate:

- Linear projection of month-to-date allowed spend to end of UTC month
- Flags caps that will exhaust before month end

Prometheus: `tokenpulse_burn_monthly_exhaust_warn_count`.

## 9. High-cost requests (Session 73 — optional for recording)

After generating traffic, the dashboard shows a **High-cost requests** table:

- Top 10 allowed events ranked by estimated USD
- Columns: time, team, app, model, tokens, USD, requestId

CLI: `npx tsx src/cli.ts --high-cost`

Useful to demonstrate outlier spend visibility without raw prompts.

## 10. Slow requests (Session 74 — optional for recording)

After generating traffic, the dashboard shows a **Slow requests** table:
- Time, team, app, model, latency ms, tokens, USD, request id
- Top 10 allowed events ranked by latencyMs (positive only)

CLI: `npx tsx src/cli.ts --slow`

Use this to call out latency outliers during the recording. No raw prompts appear.

## 11. High-token requests (Session 76 — show in recording)

After generating traffic, the dashboard shows a **High-token requests** table:

- Top 10 allowed events ranked by `totalTokens`
- Columns: time, team, app, model, tokens, USD, requestId

CLI: `npx tsx src/cli.ts --token-volume`

Useful to show token-volume outliers (distinct from pure cost). No raw prompts.

## 12. Daily spend (Session 78 — show in recording)

The dashboard shows a **Daily spend** table of the most recent UTC days with allowed spend:

- Day, calls, tokens, estimated USD
- Complements burn-rate projections

CLI: `npx tsx src/cli.ts --daily-spend`

Show this to illustrate spend trajectory over days for CFO-style visibility.

## 13. Monthly spend (Session 80 — show in recording)

The dashboard shows a **Monthly spend** table of the most recent UTC months with allowed spend:

- Month, calls, tokens, estimated USD
- Complements monthly burn-rate projections

CLI: `npx tsx src/cli.ts --monthly-spend`

Show this to illustrate multi-month spend trajectory for CFO-style visibility. No raw prompts.

## Recording checklist (for operator)

Before recording against local or Railway mock URL:

- [ ] Start gateway with `TOKENPULSE_MOCK_UPSTREAM=1` and a non-secret token
- [ ] Generate mixed traffic (allows + at least one block) via `npm run demo` or manual curls
- [ ] Show dashboard tables: By team, By app, Budgets, Rate limits, Latency, Upstream health, Daily + Monthly burn-rate, Alerts, Block reasons, Model/Team/App spend, High-cost, Slow, High-token, Daily spend, Weekly spend, Monthly spend
- [ ] Show dashboard tables: By team, By app, Budgets, Rate limits, Latency, Upstream health, Daily + Monthly burn-rate, Alerts, Block reasons, Model/Team/App spend, High-cost, Slow, High-token, Daily spend, Monthly spend, Endpoint spend, Upstream spend, Blocked impact
- [ ] Optional: scrape `/v1/admin/metrics` and mention Prometheus/Grafana path
- [ ] No keys, no real provider calls, no raw prompts on screen
- [ ] Keep under ~5 minutes; focus on policy-before-egress + audit packs + operator visibility

See `DEPLOY.md` / `railway.toml` for the public mock deploy steps.

## 14. Endpoint spend, Upstream spend, Blocked impact (Session 82 — show in recording)

The dashboard shows an **Endpoint spend, Upstream spend, Blocked impact** table of allowed cost split between chat completions and embeddings:

- Useful for FinOps when both `/v1/chat/completions` and `/v1/embeddings` are in use
- Complements model / team / app spend tables

CLI: `npx tsx src/cli.ts --endpoint-spend`



## 15. Blocked impact (Session 84 — show in recording)

The dashboard shows a **Blocked impact** table:

- Top models by number of blocks
- Estimated avoided USD using a fixed 256-token prompt assumption × model input price
- Complements the count-based Block reasons table

CLI: `npx tsx src/cli.ts --blocked-impact`

Useful to illustrate policy value (“we stopped N requests, roughly $X avoided”) without claiming real ledgered cost. No raw prompts.


## 16. Hourly spend (Session 85 — show in recording)

The dashboard shows an **Hourly spend** table of the most recent UTC hours with allowed spend:

- Useful for recent burn / spike visibility in the demo
- Complements daily / weekly / monthly tables

CLI: `npx tsx src/cli.ts --hourly-spend`

Show this to illustrate intra-day trajectory for CFO-style visibility. No raw prompts.
