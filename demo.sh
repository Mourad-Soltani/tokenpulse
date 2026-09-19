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
export TOKENPULSE_LIMITS_PATH="${TOKENPULSE_LIMITS_PATH:-$ROOT/data/limits.demo.json}"
mkdir -p "$TOKENPULSE_LEDGER_DIR"

cat > "$TOKENPULSE_BUDGETS_PATH" <<JSON
{
  "defaultDailyUsd": 25,
  "defaultMonthlyUsd": 200,
  "teams": {
    "demo-team": { "dailyUsd": 10, "monthlyUsd": 80 },
    "broke": { "dailyUsd": 0 }
  }
}
JSON

cat > "$TOKENPULSE_MODELS_PATH" <<JSON
{
  "allow": ["gpt-4o-mini", "text-embedding-3-small"],
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

cat > "$TOKENPULSE_LIMITS_PATH" <<JSON
{
  "defaultMaxPromptChars": 8000,
  "defaultMaxTokens": 2048,
  "teams": {
    "tiny": { "maxPromptChars": 8 }
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

echo "-- chat stream mock --"
STREAM=$(curl -sf -N -X POST "http://127.0.0.1:${TOKENPULSE_GATEWAY_PORT}/v1/chat/completions" \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -H "X-Tokenpulse-Team: demo-team" \
  -H "X-Tokenpulse-App: demo-app" \
  -d '{"model":"gpt-4o-mini","stream":true,"messages":[{"role":"user","content":"stream from demo.sh"}]}')
echo "$STREAM" | python3 -c "import sys; t=sys.stdin.read(); assert 'chat.completion.chunk' in t and '[DONE]' in t; print('stream ok: sse chunks received')"



echo "-- embeddings mock --"
EMB=$(curl -sf -X POST "http://127.0.0.1:${TOKENPULSE_GATEWAY_PORT}/v1/embeddings" \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -H "X-Tokenpulse-Team: demo-team" \
  -H "X-Tokenpulse-App: demo-app" \
  -d '{"model":"text-embedding-3-small","input":"tokenpulse embedding demo"}')
echo "$EMB" | python3 -c "import json,sys; b=json.load(sys.stdin); assert b['object']=='list' and len(b['data'][0]['embedding'])>=4; print('embeddings ok dim', len(b['data'][0]['embedding']))"

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

echo "-- request size limit --"
LIM=$(curl -s -o /tmp/tp-limit.json -w "%{http_code}" -X POST "http://127.0.0.1:${TOKENPULSE_GATEWAY_PORT}/v1/chat/completions" \
  -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -H "X-Tokenpulse-Team: tiny" \
  -H "X-Tokenpulse-App: demo-app" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"this is too long for tiny"}]}')
python3 -c "import json; b=json.load(open('/tmp/tp-limit.json')); assert b['error']['type']=='limit_exceeded', b; print('limit ok:', b['error']['message'])"
test "$LIM" = "413"

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

echo "-- finops pack --"
npx tsx src/cli.ts --export-finops | python3 -c "import json,sys; p=json.load(sys.stdin); assert p['version']=='tokenpulse-finops-v1', p; print('finops ok events', len(p['events']))"

echo "-- security pack --"
npx tsx src/cli.ts --export-security | python3 -c "import json,sys; p=json.load(sys.stdin); assert p['version']=='tokenpulse-security-v1', p; print('security ok blocked', p['blocked'])"

echo "-- admin summary --"
curl -s "http://127.0.0.1:${TOKENPULSE_GATEWAY_PORT}/v1/admin/summary"   -H "Authorization: Bearer demo-token" | python3 -c "import json,sys; s=json.load(sys.stdin); assert 'byTeam' in s and s['calls']>=1, s; print('admin ok calls', s['calls'], 'blocked', s['blocked'])"

echo "-- operator note --"
npx tsx src/cli.ts --note="demo reviewed spend pack" --team=demo | python3 -c "import json,sys; r=json.load(sys.stdin); assert r['ok'] is True and r['decision']=='note', r; print('note ok', r['id'])"

echo "-- verify ledger chain --"
npx tsx src/cli.ts --verify-ledger | python3 -c "import json,sys; r=json.load(sys.stdin); assert r['ok'] is True, r; print('chain ok checked', r['checked'])"

echo "demo ok"
