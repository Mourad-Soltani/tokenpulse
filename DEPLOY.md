# Tokenpulse — live pilot demo (mock-first)

This is a **client-facing demo instance**, not a paid customer VPC install and not live provider traffic.

## What you get

- Docker image + `compose.pilot.yaml`
- OpenAI-compatible gateway on port 8788
- Dashboard at `/`
- Example budget / rate / model / size policy loaded
- **Mock upstream only** (`TOKENPULSE_MOCK_UPSTREAM=1`)
- Gateway token required

No provider keys. No raw prompts stored.

## Local / VM (recommended first)

```bash
export TOKENPULSE_GATEWAY_TOKEN='a-long-random-token'   # generate locally; do not commit
docker compose -f compose.pilot.yaml up --build -d
curl -s http://127.0.0.1:8788/health
```

Open `http://127.0.0.1:8788/`, paste the token, send one chat:

```bash
curl -s http://127.0.0.1:8788/v1/chat/completions \
  -H "authorization: Bearer $TOKENPULSE_GATEWAY_TOKEN" \
  -H "content-type: application/json" \
  -H "x-tokenpulse-team: finance" \
  -H "x-tokenpulse-app: demo" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}'
```

Then refresh the dashboard. Show FinOps / CISO download buttons.

## Public URL for prospects

Point any VM / Fly / Railway / Caddy at port 8788.

Rules:

1. Keep `TOKENPULSE_MOCK_UPSTREAM=1` for prospect demos.
2. Set a strong `TOKENPULSE_GATEWAY_TOKEN`. Share it only on the call.
3. Prefer TLS at the reverse proxy. Do not publish the token in `OUTREACH.md` or GitHub.
4. Live provider keys stay **off** this instance. Paid pilots that need real models run in the *customer* VPC (`PILOT.md`).

## What this is not

- Not a multi-tenant SaaS
- Not the $15k paid pilot itself
- Not proof that a buyer has signed

Paid reference path remains: signed `PILOT.md` → their network → quote.
