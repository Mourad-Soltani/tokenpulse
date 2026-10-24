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
