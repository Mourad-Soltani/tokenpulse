#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

export TOKENPULSE_MOCK_UPSTREAM=1
export TOKENPULSE_GATEWAY_TOKEN=demo-token
export TOKENPULSE_GATEWAY_PORT="${TOKENPULSE_GATEWAY_PORT:-8799}"
export TOKENPULSE_LEDGER_DIR="${TOKENPULSE_LEDGER_DIR:-$ROOT/data/ledger-demo}"
export TOKENPULSE_BUDGETS_PATH="${TOKENPULSE_BUDGETS_PATH:-$ROOT/data/budgets.demo.json}"
export TOKENPULSE_MODELS_PATH="${TOKENPULSE_MODELS_PATH:-$ROOT/data/models.demo.json}"
export TOKENPULSE_RATES_PATH="${TOKENPULSE_RATES_PATH:-$ROOT/data/rates.demo.json}"
mkdir -p "$TOKENPULSE_LEDGER_DIR"

cat > "$TOKENPULSE_BUDGETS_PATH" <<JSON
{
  "defaultDailyUsd": 25,
  "teams": {
    "demo-team": { "dailyUsd": 10 },
    "broke": { "dailyUsd": 0 }
  }
}
JSON

cat > "$TOKENPULSE_MODELS_PATH" <<JSON
{
  "allow": ["gpt-4o-mini"],
  "deny": ["banned-model"]
}
JSON

cat > "$TOKENPULSE_RATES_PATH" <<JSON
{
  "windowMs": 60000,
  "teams": {
    "burst": { "rpm": 1 }
  }
}
JSON

echo "== Tokenpulse demo (secret-free mock + budget + model + sensitive + rate policy) =="

npx tsx src/gateway.ts &
PID=$!
cleanup() { kill "$PID" 2>/dev/null || true; }
trap cleanup EXIT

for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${TOKENPULSE_GATEWAY_PORT}/health" >/dev/null; then
    break
  fi
  sleep 0.1
done

RESP=$(curl -sf -X POST "http://127.0.0.1:${TOKENPULSE_GATEWAY_PORT}/v1/chat/completions" \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -H "X-Tokenpulse-Team: demo-team" \
  -H "X-Tokenpulse-App: demo-app" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping from demo.sh"}]}')

echo "$RESP" | python3 -c "import json,sys; b=json.load(sys.stdin); assert b['object']=='chat.completion'; print('chat ok:', b['choices'][0]['message']['content'][:80])"


echo "-- sensitive block --"
SENS=$(curl -s -o /tmp/tp-sens.json -w "%{http_code}" -X POST "http://127.0.0.1:${TOKENPULSE_GATEWAY_PORT}/v1/chat/completions" \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -H "X-Tokenpulse-Team: demo-team" \
  -H "X-Tokenpulse-App: demo-app" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"rotate sk-abcdefghijklmnopqrstuvwxyz0123"}]}')
python3 -c "import json; b=json.load(open('/tmp/tp-sens.json')); assert b['error']['type']=='sensitive_payload', b; print('sensitive ok:', b['error']['message'])"
test "$SENS" = "403"

echo "-- model deny --"

MDENY=$(curl -s -o /tmp/tp-model.json -w "%{http_code}" -X POST "http://127.0.0.1:${TOKENPULSE_GATEWAY_PORT}/v1/chat/completions" \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -H "X-Tokenpulse-Team: demo-team" \
  -H "X-Tokenpulse-App: demo-app" \
  -d '{"model":"banned-model","messages":[{"role":"user","content":"should be model-denied"}]}')
python3 -c "import json; b=json.load(open('/tmp/tp-model.json')); assert b['error']['type']=='model_denied', b; print('model deny ok:', b['error']['message'])"
test "$MDENY" = "403"

echo "-- rate limit --"
RATE1=$(curl -s -o /tmp/tp-rate1.json -w "%{http_code}" -X POST "http://127.0.0.1:${TOKENPULSE_GATEWAY_PORT}/v1/chat/completions" \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -H "X-Tokenpulse-Team: burst" \
  -H "X-Tokenpulse-App: demo-app" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"rate first"}]}')
RATE2=$(curl -s -o /tmp/tp-rate2.json -w "%{http_code}" -X POST "http://127.0.0.1:${TOKENPULSE_GATEWAY_PORT}/v1/chat/completions" \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -H "X-Tokenpulse-Team: burst" \
  -H "X-Tokenpulse-App: demo-app" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"rate second"}]}')
python3 -c "import json; b=json.load(open('/tmp/tp-rate2.json')); assert b['error']['type']=='rate_limited', b; print('rate ok:', b['error']['message'])"
test "$RATE1" = "200"
test "$RATE2" = "429"

echo "-- budget block --"
BLOCK=$(curl -s -o /tmp/tp-block.json -w "%{http_code}" -X POST "http://127.0.0.1:${TOKENPULSE_GATEWAY_PORT}/v1/chat/completions" \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -H "X-Tokenpulse-Team: broke" \
  -H "X-Tokenpulse-App: demo-app" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"should be blocked"}]}')
python3 -c "import json; b=json.load(open('/tmp/tp-block.json')); assert b['error']['type']=='budget_exceeded', b; print('block ok:', b['error']['message'])"
test "$BLOCK" = "429"

echo "-- ledger summary --"
npx tsx src/cli.ts --summary

echo "-- admin summary --"
curl -s "http://127.0.0.1:${TOKENPULSE_GATEWAY_PORT}/v1/admin/summary"   -H "Authorization: Bearer demo-token" | python3 -c "import json,sys; s=json.load(sys.stdin); assert 'byTeam' in s and s['calls']>=1, s; print('admin ok calls', s['calls'], 'blocked', s['blocked'])"

echo "demo ok"
