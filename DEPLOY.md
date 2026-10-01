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

Point any VM / Fly / Caddy at port 8788, or use the Railway section below.

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


## Railway (prospect mock demo)

This environment has **no Railway account token**. Deploy from *your* Railway dashboard so the token never enters chat or git.

1. [railway.com/new](https://railway.com/new) → **Deploy from GitHub repo** → `Mourad-Soltani/tokenpulse` → `main`.
2. Railway will pick up `Dockerfile` + `railway.toml` (health check `/health`).
3. Service **Variables** (dashboard only):

| Variable | Value |
|----------|--------|
| `TOKENPULSE_MOCK_UPSTREAM` | `1` |
| `TOKENPULSE_GATEWAY_TOKEN` | generate locally (`openssl rand -hex 24`) |
| `TOKENPULSE_GATEWAY_HOST` | `0.0.0.0` (optional; set automatically when Railway injects `PORT`) |

Do **not** set `OPENAI_API_KEY`, `XAI_API_KEY`, or `TOKENPULSE_MOCK_UPSTREAM=0`.

4. Settings → **Networking** → Generate domain.
5. Open `https://<service>.up.railway.app/`, paste the gateway token, run the curl from above against that origin.

CLI alternative (on your laptop, after `railway login`):

```bash
cd tokenpulse
railway init   # pick/create project
railway variable set TOKENPULSE_MOCK_UPSTREAM=1
railway variable set TOKENPULSE_GATEWAY_TOKEN="$(openssl rand -hex 24)"
railway up
railway domain
```

If you create a Railway **project token** in the dashboard, keep it in your local shell only. Do not paste it here.
