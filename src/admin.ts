import { budgetStatus, type BudgetStatusRow } from "./budget.js";
import { rateStatus, type RateStatusRow } from "./ratelimit.js";
import { limitStatus, type LimitStatusRow } from "./limits.js";
import { upstreamStatus, type UpstreamStatus } from "./upstream.js";
import { modelStatusAsync, type ModelStatus } from "./models.js";
import { sensitiveStatus, type SensitiveStatus } from "./sensitive.js";
import { ledgerStatus, readEvents, summarize, verifyChain, type LedgerStatus } from "./ledger.js";
import { pricingStatus, type PricingStatus } from "./pricing.js";
import { gatewayStatus, type GatewayRuntimeStatus } from "./runtime.js";
import { exportStatus, type ExportStatus } from "./export.js";
import { policyPipelineStatus, type PolicyPipelineStatus } from "./policy.js";
import { attributionStatus, type AttributionStatus } from "./attribution.js";
import { correlationStatus, type CorrelationStatus } from "./correlation.js";
import type { UsageEvent } from "./types.js";

export type AdminSummary = ReturnType<typeof summarize> & {
  day?: string;
  recentBlocked: UsageEvent[];
  chainOk: boolean;
  chainChecked: number;
  budgets: BudgetStatusRow[];
  budgetWarns: number;
  rates: RateStatusRow[];
  rateWarns: number;
  limits: LimitStatusRow[];
  limitWarns: number;
  upstreams: UpstreamStatus;
  models: ModelStatus;
  sensitive: SensitiveStatus;
  ledger: LedgerStatus;
  pricing: PricingStatus;
  gateway: GatewayRuntimeStatus;
  exports: ExportStatus;
  policy: PolicyPipelineStatus;
  attribution: AttributionStatus;
  correlation: CorrelationStatus;
};

export async function adminSummary(opts?: { day?: string; blockedLimit?: number }): Promise<AdminSummary> {
  const events = await readEvents({ day: opts?.day });
  const blockedLimit = Math.min(Math.max(opts?.blockedLimit ?? 20, 1), 100);
  const recentBlocked = events
    .filter((e) => e.decision === "block")
    .slice(-blockedLimit)
    .reverse();
  const chain = verifyChain(events);
  const budgets = await budgetStatus();
  const rates = await rateStatus();
  const limits = await limitStatus();
  const upstreams = upstreamStatus();
  const models = await modelStatusAsync();
  const sensitive = sensitiveStatus();
  return {
    ...summarize(events),
    day: opts?.day,
    recentBlocked,
    chainOk: chain.ok,
    chainChecked: chain.checked,
    budgets,
    budgetWarns: budgets.filter((b) => b.warn).length,
    rates,
    rateWarns: rates.filter((r) => r.warn).length,
    limits,
    limitWarns: limits.filter((l) => l.warn).length,
    upstreams,
    models,
    sensitive,
    ledger: ledgerStatus(events),
    pricing: pricingStatus(),
    gateway: gatewayStatus(),
    exports: exportStatus(),
    policy: policyPipelineStatus(),
    attribution: attributionStatus(),
    correlation: correlationStatus(),
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
    <h2 style="margin:0 0 8px;font-size:1rem">Gateway</h2>
    <p class="sub" id="gwmeta"></p>
    <table id="gateway"><thead><tr><th>Host</th><th>Port</th><th>Loopback</th><th>Mock</th><th>Auth</th></tr></thead><tbody></tbody></table>
  </div>
  <div class="card" style="margin-top:16px">
    <h2 style="margin:0 0 8px;font-size:1rem">Export packs</h2>
    <p class="sub" id="exmeta"></p>
    <table id="exports"><thead><tr><th>Pack</th><th>Version</th><th>Formats</th><th>Raw prompts</th></tr></thead><tbody></tbody></table>
  </div>
  <div class="card" style="margin-top:16px">
    <h2 style="margin:0 0 8px;font-size:1rem">Policy pipeline</h2>
    <p class="sub" id="policymeta"></p>
    <table id="policy"><thead><tr><th>#</th><th>Stage</th><th>On deny</th><th>Applies</th></tr></thead><tbody></tbody></table>
  </div>
  <div class="card" style="margin-top:16px">
    <h2 style="margin:0 0 8px;font-size:1rem">Attribution</h2>
    <p class="sub" id="attrmeta"></p>
    <table id="attribution"><thead><tr><th>Header</th><th>Ledger field</th><th>Default</th><th>Required</th></tr></thead><tbody></tbody></table>
  </div>
  <div class="card" style="margin-top:16px">
    <h2 style="margin:0 0 8px;font-size:1rem">Correlation</h2>
    <p class="sub" id="corrmeta"></p>
    <table id="correlation"><thead><tr><th>Header</th><th>Ledger field</th><th>In hash chain</th><th>Raw prompts</th></tr></thead><tbody></tbody></table>
  </div>
  <div class="card" style="margin-top:16px">
    <h2 style="margin:0 0 8px;font-size:1rem">Budgets</h2>
    <table id="budgets"><thead><tr><th>Scope</th><th>Id</th><th>Period</th><th>Spent</th><th>Cap</th><th>Left</th><th>Status</th></tr></thead><tbody></tbody></table>
  </div>
  <div class="card" style="margin-top:16px">
    <h2 style="margin:0 0 8px;font-size:1rem">Rate limits</h2>
    <table id="rates"><thead><tr><th>Scope</th><th>Id</th><th>Used</th><th>RPM cap</th><th>Left</th><th>Window ms</th><th>Status</th></tr></thead><tbody></tbody></table>
  </div>
  <div class="card" style="margin-top:16px">
    <h2 style="margin:0 0 8px;font-size:1rem">Request size limits</h2>
    <table id="limits"><thead><tr><th>Scope</th><th>Id</th><th>Kind</th><th>Cap</th><th>Status</th></tr></thead><tbody></tbody></table>
  </div>
  <div class="card" style="margin-top:16px">
    <h2 style="margin:0 0 8px;font-size:1rem">Upstreams</h2>
    <p class="sub" id="upmeta"></p>
    <table id="upstreams"><thead><tr><th>#</th><th>Source</th><th>Host</th><th>Weight</th><th>First hop</th></tr></thead><tbody></tbody></table>
  </div>
  <div class="card" style="margin-top:16px">
    <h2 style="margin:0 0 8px;font-size:1rem">Models</h2>
    <p class="sub" id="modelmeta"></p>
    <table id="models"><thead><tr><th>Kind</th><th>Client</th><th>Upstream</th></tr></thead><tbody></tbody></table>
  </div>
  <div class="card" style="margin-top:16px">
    <h2 style="margin:0 0 8px;font-size:1rem">Sensitive payload</h2>
    <p class="sub" id="sensmeta"></p>
    <table id="sensitive"><thead><tr><th>Mode</th><th>Categories</th><th>Custom patterns</th></tr></thead><tbody></tbody></table>
  </div>
  <div class="card" style="margin-top:16px">
    <h2 style="margin:0 0 8px;font-size:1rem">Pricing catalog</h2>
    <p class="sub" id="pricemeta"></p>
    <table id="pricing"><thead><tr><th>Model</th><th>Input / 1M</th><th>Output / 1M</th><th>Source</th></tr></thead><tbody></tbody></table>
  </div>
  <div class="card" style="margin-top:16px">
    <h2 style="margin:0 0 8px;font-size:1rem">Ledger</h2>
    <p class="sub" id="ledgermeta"></p>
    <table id="ledger"><thead><tr><th>Driver</th><th>Events</th><th>Chain</th><th>Checked</th><th>Legacy skipped</th><th>Tip</th></tr></thead><tbody></tbody></table>
  </div>
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
    ['Budget warns', s.budgetWarns ?? 0],
    ['Rate warns', s.rateWarns ?? 0],
    ['Limit warns', s.limitWarns ?? 0],
    ['Upstreams', (s.upstreams && s.upstreams.hops) ? s.upstreams.hops.length : 0],
    ['Model mode', (s.models && s.models.mode) ? s.models.mode : 'open'],
    ['Sensitive', (s.sensitive && s.sensitive.mode) ? s.sensitive.mode : 'on'],
    ['Ledger', (s.ledger && s.ledger.driver) ? s.ledger.driver : 'jsonl'],
    ['Priced models', (s.pricing && s.pricing.catalogCount) ? s.pricing.catalogCount : 0],
    ['Bind', (s.gateway ? (s.gateway.host+':'+s.gateway.port) : '127.0.0.1:8788')],
    ['Exports', (s.exports && s.exports.formats) ? s.exports.formats.join('+') : 'json+csv'],
    ['Policy stages', (s.policy && s.policy.stageCount) ? s.policy.stageCount : 7],
    ['Attr fields', (s.attribution && s.attribution.fieldCount) ? s.attribution.fieldCount : 2],
    ['Request id', (s.correlation && s.correlation.header) ? s.correlation.header : 'X-Tokenpulse-Request-Id'],
    ['Chain', (s.ledger && s.ledger.chainOk === false) || s.chainOk === false ? 'broken' : 'ok']
  ].map(([k,v]) => '<div class="card">'+k+'<b>'+v+'</b></div>').join('');
  const gw = s.gateway || { host:'127.0.0.1', port:8788, loopback:true, mockUpstream:false, authRequired:false };
  document.getElementById('gwmeta').textContent = (gw.loopback ? 'loopback' : 'non-loopback') + ' · ' + (gw.mockUpstream ? 'mock' : 'live-capable') + ' · ' + (gw.authRequired ? 'auth on' : 'auth off');
  const gwt = document.querySelector('#gateway tbody');
  gwt.innerHTML = '<tr><td>'+gw.host+'</td><td>'+gw.port+'</td><td class="'+(gw.loopback?'ok':'bad')+'">'+(gw.loopback?'yes':'no')+'</td><td>'+(gw.mockUpstream?'on':'off')+'</td><td>'+(gw.authRequired?'required':'open')+'</td></tr>';
  const ex = s.exports || { finopsVersion:'tokenpulse-finops-v1', securityVersion:'tokenpulse-security-v1', formats:['json','csv'], includesRawPrompts:false };
  document.getElementById('exmeta').textContent = (ex.includesRawPrompts ? 'includes prompts' : 'no raw prompts') + ' · notes omitted from FinOps rows';
  const ext = document.querySelector('#exports tbody');
  ext.innerHTML = '<tr><td>FinOps</td><td>'+ex.finopsVersion+'</td><td>'+(ex.formats||[]).join(', ')+'</td><td class="ok">'+(ex.includesRawPrompts?'yes':'never')+'</td></tr>'
    + '<tr><td>CISO</td><td>'+ex.securityVersion+'</td><td>'+(ex.formats||[]).join(', ')+'</td><td class="ok">'+(ex.includesRawPrompts?'yes':'never')+'</td></tr>';
  const pol = s.policy || { version:'tokenpulse-policy-v1', storesRawPrompts:false, stageCount:7, stages:[] };
  document.getElementById('policymeta').textContent = pol.version + ' · ' + (pol.stageCount||0) + ' stages · raw prompts ' + (pol.storesRawPrompts ? 'yes' : 'never');
  const plt = document.querySelector('#policy tbody');
  plt.innerHTML = (pol.stages||[]).map(st =>
    '<tr><td>'+st.order+'</td><td>'+st.name+'</td><td>'+st.onDeny+'</td><td>'+(st.appliesTo||[]).join(', ')+'</td></tr>'
  ).join('') || '<tr><td colspan="4">no stages</td></tr>';
  const attr = s.attribution || { version:'tokenpulse-attribution-v1', storesRawPrompts:false, fieldCount:2, fields:[], notes:'' };
  document.getElementById('attrmeta').textContent = attr.version + ' · ' + (attr.fieldCount||0) + ' fields · ' + (attr.notes||'');
  const at = document.querySelector('#attribution tbody');
  at.innerHTML = (attr.fields||[]).map(f =>
    '<tr><td>'+f.header+'</td><td>'+f.ledgerField+'</td><td>'+f.defaultValue+'</td><td>'+(f.required?'yes':'no')+'</td></tr>'
  ).join('') || '<tr><td colspan="4">no fields</td></tr>';
  const corr = s.correlation || { version:'tokenpulse-correlation-v1', header:'X-Tokenpulse-Request-Id', ledgerField:'requestId', inHashChain:false, storesRawPrompts:false, notes:'' };
  document.getElementById('corrmeta').textContent = corr.version + ' · ' + (corr.notes||'');
  const ct = document.querySelector('#correlation tbody');
  ct.innerHTML = '<tr><td>'+corr.header+'</td><td>'+corr.ledgerField+'</td><td>'+(corr.inHashChain?'yes':'no')+'</td><td>'+(corr.storesRawPrompts?'yes':'no')+'</td></tr>';
  const bud = document.querySelector('#budgets tbody');
  bud.innerHTML = (s.budgets || []).map(b => {
    const st = b.exhausted ? 'exhausted' : (b.warn ? 'warn' : 'ok');
    const cls = b.exhausted || b.warn ? 'bad' : 'ok';
    return '<tr><td>'+b.scope+'</td><td>'+b.id+'</td><td>'+b.period+'</td><td>'+b.spentUsd+'</td><td>'+b.capUsd+'</td><td>'+b.remainingUsd+'</td><td class="'+cls+'">'+st+'</td></tr>';
  }).join('') || '<tr><td colspan="7">no caps configured</td></tr>';
  const rt = document.querySelector('#rates tbody');
  rt.innerHTML = (s.rates || []).map(r => {
    const st = r.exhausted ? 'exhausted' : (r.warn ? 'warn' : 'ok');
    const cls = r.exhausted || r.warn ? 'bad' : 'ok';
    return '<tr><td>'+r.scope+'</td><td>'+r.id+'</td><td>'+r.used+'</td><td>'+r.capRpm+'</td><td>'+r.remaining+'</td><td>'+r.windowMs+'</td><td class="'+cls+'">'+st+'</td></tr>';
  }).join('') || '<tr><td colspan="7">no rpm caps configured</td></tr>';
  const up = s.upstreams || {};
  document.getElementById('upmeta').textContent = (up.mock ? 'mock on' : 'mock off') + ' · ' + (up.liveConfigured ? 'live configured' : 'live unset') + ' · ' + (up.weighted ? 'weighted' : 'unweighted');
  const uh = document.querySelector('#upstreams tbody');
  uh.innerHTML = (up.hops || []).map(h => {
    const elig = h.firstEligible ? 'eligible' : 'fallback-only';
    const cls = h.firstEligible ? 'ok' : 'bad';
    return '<tr><td>'+h.position+'</td><td>'+h.source+'</td><td>'+h.host+'</td><td>'+(h.weight==null?'—':h.weight)+'</td><td class="'+cls+'">'+elig+'</td></tr>';
  }).join('') || '<tr><td colspan="5">no live hops configured</td></tr>';
  const md = s.models || { mode:'open', allow:[], deny:[], remaps:[], visibleCount:0 };
  document.getElementById('modelmeta').textContent = md.mode + ' · visible ' + (md.visibleCount ?? 0) + ' · allow ' + (md.allow||[]).length + ' · deny ' + (md.deny||[]).length + ' · remap ' + (md.remaps||[]).length;
  const mt = document.querySelector('#models tbody');
  const rows = [];
  (md.allow||[]).forEach(id => rows.push('<tr><td class="ok">allow</td><td>'+id+'</td><td>—</td></tr>'));
  (md.deny||[]).forEach(id => rows.push('<tr><td class="bad">deny</td><td>'+id+'</td><td>—</td></tr>'));
  (md.remaps||[]).forEach(r => rows.push('<tr><td>remap</td><td>'+r.from+'</td><td>'+r.to+'</td></tr>'));
  mt.innerHTML = rows.join('') || '<tr><td colspan="3">open catalog (no allow/deny/remap)</td></tr>';
  const lim = document.querySelector('#limits tbody');
  lim.innerHTML = (s.limits || []).map(l => {
    const st = l.exhausted ? 'hard-block' : (l.warn ? 'warn' : 'ok');
    const cls = l.exhausted || l.warn ? 'bad' : 'ok';
    return '<tr><td>'+l.scope+'</td><td>'+l.id+'</td><td>'+l.kind+'</td><td>'+l.cap+'</td><td class="'+cls+'">'+st+'</td></tr>';
  }).join('') || '<tr><td colspan="5">no size caps configured</td></tr>';
  const se = s.sensitive || { mode:'on', categories:[], extraPatterns:0 };
  document.getElementById('sensmeta').textContent = (se.enabled === false ? 'scan off' : 'scan on') + ' · custom ' + (se.extraPatterns ?? 0);
  const st = document.querySelector('#sensitive tbody');
  st.innerHTML = '<tr><td class="'+(se.enabled===false?'bad':'ok')+'">'+se.mode+'</td><td>'+(se.categories||[]).join(', ')+'</td><td>'+(se.extraPatterns??0)+'</td></tr>';
  const pr = s.pricing || { unit:'usd_per_million_tokens', catalogCount:0, fallback:{input:1,output:3}, rows:[] };
  document.getElementById('pricemeta').textContent = (pr.catalogCount||0) + ' catalog models · fallback $' + (pr.fallback&&pr.fallback.input) + '/$' + (pr.fallback&&pr.fallback.output) + ' per 1M';
  const pt = document.querySelector('#pricing tbody');
  pt.innerHTML = (pr.rows||[]).map(r =>
    '<tr><td>'+r.model+'</td><td>$'+r.inputPerMillion+'</td><td>$'+r.outputPerMillion+'</td><td class="ok">'+(r.known?'table':'fallback')+'</td></tr>'
  ).join('') || '<tr><td colspan="4">empty catalog</td></tr>';
  const ld = s.ledger || { driver:'jsonl', events:0, chainOk:true, chainChecked:0, skippedLegacy:0 };
  document.getElementById('ledgermeta').textContent = (ld.chainOk === false ? 'chain broken' : 'chain ok') + (ld.brokenAt ? ' at '+ld.brokenAt : '');
  const lt = document.querySelector('#ledger tbody');
  const lcls = ld.chainOk === false ? 'bad' : 'ok';
  lt.innerHTML = '<tr><td>'+ld.driver+'</td><td>'+ld.events+'</td><td class="'+lcls+'">'+(ld.chainOk===false?'broken':'ok')+'</td><td>'+(ld.chainChecked??0)+'</td><td>'+(ld.skippedLegacy??0)+'</td><td>'+(ld.tipHashPrefix||'—')+'</td></tr>';
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
