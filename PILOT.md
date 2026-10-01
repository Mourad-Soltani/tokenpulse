# Tokenpulse — paid pilot (path to first commercial reference)

**Problem this closes:** zero commercial references.  
**Honest constraint:** a reference requires a real counterparty. This doc is the **offer + capture process**, not a fabricated logo.

## Offer (aligns with TEASER.md)

| Item | Terms |
|------|--------|
| Software | MIT — customer self-hosts from the repo |
| **Paid pilot support** | **$15,000 fixed / 30 days** |
| Includes | Deploy help (loopback → their VPC/VM), policy templates (budget/rate/model/sensitive), walkthrough of FinOps + CISO packs, one architecture call, async Slack/email support |
| Excludes | SLA uptime, multi-region HA, custom SSO (roadmap), unlimited eng time |
| Success criteria (agree in writing) | Gateway in path for ≥1 internal app; one FinOps export used in a finance/ops review; one security pack reviewed by security/IT |
| Optional follow-on | Priority support from **$60k/yr** |

## How a reference is earned (do not skip)

1. Signed pilot email or short SOW (scope, fee, 30 days, success criteria).  
2. Deploy + demo recording shared with the pilot team.  
3. At day 30: ask for a **2–3 sentence quote** (name, title, company permission).  
4. Only then add a line under **References** below (or a private diligence appendix).

## References

_None yet. Do not invent logos. First pilot completes → first line here._

| Org | Role | Quote | Date |
|-----|------|-------|------|
| — | — | — | — |

## One-paragraph outreach add-on

> We offer a fixed **$15k / 30-day pilot**: self-hosted install, policy templates, and FinOps/CISO pack walkthrough against one internal app. Software stays MIT. If useful after the pilot, annual priority support starts at $60k. Happy to start from the secret-free demo and a short technical call.

## Internal tracking

- [ ] First pilot conversation scheduled  
- [ ] Pilot agreement sent  
- [ ] Pilot paid / started  
- [ ] Success criteria met  
- [ ] Written quote received → update table above  


## Public mock demo (Session 38)

For *prospect walkthroughs* only — not a signed paid pilot.

```bash
export TOKENPULSE_GATEWAY_TOKEN='generate-locally'
docker compose -f compose.pilot.yaml up --build -d
```

See `DEPLOY.md`. Mock upstream stays on. Do not put provider keys on the public instance.
Share the URL + token on the call, not in git.

- [ ] Demo container running on a host you control
- [ ] TLS in front (if public)
- [ ] Token rotated after each external demo if it was shown on screen
