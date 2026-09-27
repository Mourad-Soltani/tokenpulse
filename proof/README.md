# Diligence proof pack (machine-verifiable)

Generated from the secret-free demo path. **No provider keys. No raw prompts.**

| File | What it proves |
|------|----------------|
| `sample-summary.json` | Team/app attribution + allow/block counts |
| `sample-finops.json` | `tokenpulse-finops-v1` spend pack |
| `sample-security.json` | `tokenpulse-security-v1` blocks + policy hits + `requestHash` only |
| `sample-chain.json` | Hash chain verifies (`ok: true`) |

## Reproduce on your machine

```bash
npm install && npm test && npm run demo
TOKENPULSE_LEDGER_DIR=./data/ledger-demo npx tsx src/cli.ts --export-finops
TOKENPULSE_LEDGER_DIR=./data/ledger-demo npx tsx src/cli.ts --export-security
TOKENPULSE_LEDGER_DIR=./data/ledger-demo npx tsx src/cli.ts --verify-ledger
```

Samples here are **illustrative** from one demo run. Re-run for fresh timestamps.

## Operator recording (human — not automation)

See `../PROOF.md` and `../DEMO.md`. Screen capture is local-only; never put API keys on camera.
