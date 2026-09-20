# Tokenpulse demo walkthrough (secret-free)

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
