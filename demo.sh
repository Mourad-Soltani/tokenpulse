#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

export TOKENPULSE_MOCK_UPSTREAM=1
export TOKENPULSE_GATEWAY_TOKEN=demo-token
export TOKENPULSE_GATEWAY_PORT="${TOKENPULSE_GATEWAY_PORT:-8799}"
export TOKENPULSE_LEDGER_DIR="${TOKENPULSE_LEDGER_DIR:-$ROOT/data/ledger-demo}"
mkdir -p "$TOKENPULSE_LEDGER_DIR"

echo "== Tokenpulse demo (secret-free mock upstream) =="

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

echo "-- ledger summary --"
npx tsx src/cli.ts --summary
echo "demo ok"
