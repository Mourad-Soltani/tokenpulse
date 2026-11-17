# Tokenpulse Scale Model

Transparent projection for CFO conversations. Visibility only — not a ledger fact.

## What it is

`scaleModelStatus` projects monthly and annual avoided USD at an **operator-chosen** request volume using:

```
observedBlockRate × avgCostPerAllowedRequest × targetMonthlyRequests
```

## Defaults

- Target volume: 1,000,000 requests / month
- Block rate and average allowed cost come from the current ledger window

## Assumptions (always returned)

1. Observed block rate is representative.
2. Average cost of an allowed request is a reasonable proxy for a blocked request that would have been allowed.
3. Target volume is chosen by the operator; it is not derived from the ledger.
4. Linear only — no seasonality, mix shift, or compounding.

## Usage

```bash
# default 1M requests/month
npx tsx src/cli.ts --scale-model

# or
npm run scale-model

# custom volume
npx tsx src/cli.ts --scale-model --monthly-requests=5000000

# with a seeded demo ledger
TOKENPULSE_LEDGER_DIR=data/ledger-seed npx tsx src/cli.ts --seed-demo --enterprise --force
TOKENPULSE_LEDGER_DIR=data/ledger-seed npx tsx src/cli.ts --scale-model --monthly-requests=2000000
```

## Distinction from other estimators

| Estimator | Basis | Use |
|-----------|-------|-----|
| `blockedImpact` / annual-avoided | Fixed token assumption on observed blocks | Demo visibility of current window |
| **Scale model** | Observed block rate × avg allowed cost × target volume | Honest enterprise projection for buyer conversations |

Do not present the fixed-token avoided-$ numbers as CFO proof. Use the scale model and state the assumptions.

## Buyer brief

The same projection is included in `buyerBrief()` (CLI `--buyer-brief` and the dashboard Buyer brief card). The operator should state the four assumptions when using the number in a CFO conversation.
