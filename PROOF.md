# Tokenpulse — diligence proof (close the “live proof” gap)

**Goal:** Give a buyer reproducible evidence without waiting on a perfect video.  
**Still required from the operator:** a short local screen recording (this doc cannot replace your camera).

## A. Machine proof (closed in-repo)

| Check | Command / artifact | Expected |
|-------|--------------------|----------|
| Tests | `npm test` | All pass (81+) |
| Secret-free demo | `npm run demo` | Exit 0; blocks + packs + chain |
| FinOps pack | `proof/sample-finops.json` or re-export | `tokenpulse-finops-v1` |
| CISO pack | `proof/sample-security.json` | Blocks + policyHits; **no prompt text** |
| Chain | `proof/sample-chain.json` | `ok: true` |
| Architecture | `ARCHITECTURE.md` ↔ `src/gateway.ts` | Policy order before upstream |

## B. Operator recording checklist (15–25 min)

Do this **once** on your laptop. Store the file privately (Drive/Loom unlisted). Do **not** commit video to git.

1. Terminal: `npm install && npm test && npm run demo` — show green exit.
2. Optional: gateway + browser dashboard (`DEMO.md` §3).
3. Optional live (keys in shell only, **never on screen**): one chat with mock off; show ledger allow + cost &gt; 0; rotate key afterward.
4. Open FinOps + security JSON in an editor — zoom policy hits / `requestHash`.
5. Stop recording. Filename suggestion: `tokenpulse-demo-YYYYMMDD.mp4`.

## C. What to send in diligence

1. Repo link + this file  
2. `proof/` samples (or fresh exports)  
3. Recording link (after NDA / serious reply if preferred)  
4. `ARCHITECTURE.md` + `SALE.md` / `TEASER.md`  

## Status

| Item | State |
|------|--------|
| Machine-verifiable packs + tests | **Closed** (Session 30) |
| Local screen recording | **Operator** — checklist above |
| Live upstream on camera | Optional; mock path is enough for first technical look |
