import { readEvents, summarize, verifyChain } from "./ledger.js";
import type { UsageEvent } from "./types.js";

export type AdminSummary = ReturnType<typeof summarize> & {
  day?: string;
  recentBlocked: UsageEvent[];
  chainOk: boolean;
  chainChecked: number;
};

export async function adminSummary(opts?: { day?: string; blockedLimit?: number }): Promise<AdminSummary> {
  const events = await readEvents({ day: opts?.day });
  const blockedLimit = Math.min(Math.max(opts?.blockedLimit ?? 20, 1), 100);
  const recentBlocked = events
    .filter((e) => e.decision === "block")
    .slice(-blockedLimit)
    .reverse();
  const chain = verifyChain(events);
  return {
    ...summarize(events),
    day: opts?.day,
    recentBlocked,
    chainOk: chain.ok,
    chainChecked: chain.checked,
  };
}

export function dashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Tokenpulse</title>
  <style>
    :root { color-scheme: dark; --bg:#0b0f14; --card:#151b23; --fg:#e8eef4; --muted:#8aa0b5; --ok:#3dd68c; --bad:#ff6b6b; }
    body { margin:0; font-family: ui-sans-serif, system-ui, sans-serif; background:var(--bg); color:var(--fg); }
    main { max-width:960px; margin:0 auto; padding:24px; }
    h1 { font-size:1.4rem; margin:0 0 4px; }
    p.sub { color:var(--muted); margin:0 0 20px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; }
    .card { background:var(--card); border-radius:12px; padding:14px 16px; }
    .card b { display:block; font-size:1.25rem; margin-top:6px; }
    table { width:100%; border-collapse:collapse; font-size:0.9rem; }
    th,td { text-align:left; padding:8px 6px; border-bottom:1px solid #243041; }
    .ok { color:var(--ok); } .bad { color:var(--bad); }
    input { background:#0f141b; color:var(--fg); border:1px solid #2a3646; border-radius:8px; padding:8px 10px; width:min(360px,100%); }
    button { background:#2a6df4; color:white; border:0; border-radius:8px; padding:8px 12px; cursor:pointer; }
    .row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
  </style>
</head>
<body>
<main>
  <h1>Tokenpulse</h1>
  <p class="sub">Loopback FinOps dashboard — spend, policy blocks, team attribution.</p>
  <div class="row">
    <input id="token" placeholder="Gateway token (if required)" />
    <button id="load">Refresh</button>
    <button id="finops" type="button">FinOps pack</button>
    <button id="security" type="button">CISO pack</button>
    <input id="note" placeholder="Operator note (append-only)" />
    <button id="savenote" type="button">Add note</button>
  </div>
  <div class="grid" id="kpis"></div>
  <div class="card" style="margin-top:16px">
    <h2 style="margin:0 0 8px;font-size:1rem">By team</h2>
    <table id="teams"><thead><tr><th>Team</th><th>Calls</th><th>Tokens</th><th>USD</th></tr></thead><tbody></tbody></table>
  </div>
  <div class="card" style="margin-top:16px">
    <h2 style="margin:0 0 8px;font-size:1rem">By app</h2>
    <table id="apps"><thead><tr><th>App</th><th>Calls</th><th>Tokens</th><th>USD</th></tr></thead><tbody></tbody></table>
  </div>
  <div class="card" style="margin-top:16px">
    <h2 style="margin:0 0 8px;font-size:1rem">Recent blocks</h2>
    <table id="blocks"><thead><tr><th>Time</th><th>Team</th><th>Model</th><th>Policy</th></tr></thead><tbody></tbody></table>
  </div>
</main>
<script>
const tokenEl = document.getElementById('token');
tokenEl.value = localStorage.getItem('tokenpulse.token') || '';
document.getElementById('load').onclick = load;
document.getElementById('finops').onclick = () => download('/v1/admin/export/finops');
document.getElementById('security').onclick = () => download('/v1/admin/export/security');
document.getElementById('savenote').onclick = async () => {
  const text = document.getElementById('note').value;
  const res = await fetch('/v1/admin/note', { method:'POST', headers:{...headers(),'content-type':'application/json'}, body: JSON.stringify({ text, teamId:'ops' }) });
  if (!res.ok) { alert('note ' + res.status); return; }
  document.getElementById('note').value = '';
  load();
};
function headers() {
  const token = tokenEl.value.trim();
  return token ? { 'X-Tokenpulse-Token': token } : {};
}
async function download(path) {
  const res = await fetch(path, { headers: headers() });
  if (!res.ok) { alert(path + ' ' + res.status); return; }
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = path.includes('security') ? 'tokenpulse-security.json' : 'tokenpulse-finops.json';
  a.click();
}
async function load() {
  const token = tokenEl.value.trim();
  localStorage.setItem('tokenpulse.token', token);
  const res = await fetch('/v1/admin/summary', { headers: headers() });
  if (!res.ok) { alert('summary ' + res.status); return; }
  const s = await res.json();
  document.getElementById('kpis').innerHTML = [
    ['Calls', s.calls],
    ['Allowed', s.allowed],
    ['Blocked', s.blocked],
    ['Tokens', s.tokens],
    ['USD', s.costUsd],
    ['Notes', s.notes ?? 0],
    ['Chain', s.chainOk === false ? 'broken' : 'ok']
  ].map(([k,v]) => '<div class="card">'+k+'<b>'+v+'</b></div>').join('');
  const tb = document.querySelector('#teams tbody');
  tb.innerHTML = Object.entries(s.byTeam || {}).map(([id,t]) =>
    '<tr><td>'+id+'</td><td>'+t.calls+'</td><td>'+t.tokens+'</td><td>'+t.costUsd+'</td></tr>').join('') || '<tr><td colspan="4">none</td></tr>';
  const ab = document.querySelector('#apps tbody');
  ab.innerHTML = Object.entries(s.byApp || {}).map(([id,t]) =>
    '<tr><td>'+id+'</td><td>'+t.calls+'</td><td>'+t.tokens+'</td><td>'+t.costUsd+'</td></tr>').join('') || '<tr><td colspan="4">none</td></tr>';
  const bb = document.querySelector('#blocks tbody');
  bb.innerHTML = (s.recentBlocked || []).map(e =>
    '<tr><td>'+e.timestamp+'</td><td>'+e.teamId+'</td><td>'+e.model+'</td><td class="bad">'+(e.policyIds||[]).join(', ')+'</td></tr>').join('') || '<tr><td colspan="4">none</td></tr>';
}
load();
</script>
</body>
</html>`;
}
