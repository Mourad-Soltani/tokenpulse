import { endpointSpendStatus } from "./endpointSpend.js";
import { blockedImpactStatus } from "./blockedImpact.js";
import { upstreamSpendStatus } from "./upstreamSpend.js";
import { teamSpendStatus } from "./teamSpend.js";
import { appSpendStatus } from "./appSpend.js";
import { dailySpendStatus } from "./dailySpend.js";
import { monthlySpendStatus } from "./monthlySpend.js";
import { weeklySpendStatus } from "./weeklySpend.js";
import { hourlySpendStatus } from "./hourlySpend.js";
import { efficiencyStatus } from "./efficiency.js";
import { teamEfficiencyStatus } from "./teamEfficiency.js";
import { appEfficiencyStatus } from "./appEfficiency.js";
import { upstreamEfficiencyStatus } from "./upstreamEfficiency.js";
import { keyEfficiencyStatus } from "./keyEfficiency.js";
import { appendOperatorNote, findEventsByRequestId, readEvents, summarize, verifyChain } from "./ledger.js";
import { enableClientKey, issueClientKey, keyStatus, revokeClientKey, rotateClientKey } from "./keys.js";
import { isSafeRequestId } from "./correlation.js";
import { buildFinopsPack, buildSecurityPack, finopsCsv, securityCsv } from "./export.js";
import { discoveryStatus, unattributedStatus } from "./discovery.js";
import { blockReasonsStatus } from "./blockReasons.js";
import { modelSpendStatus } from "./modelSpend.js";
import { highCostStatus } from "./highCost.js";
import { slowRequestStatus } from "./slowRequests.js";
import { tokenVolumeStatus } from "./tokenVolume.js";
import { adminSummary } from "./admin.js";
import { postAlerts, webhookStatus } from "./notify.js";

async function main() {
  const args = process.argv.slice(2);
  const dayArg = args.find((a) => a.startsWith("--day="))?.slice("--day=".length);
  const events = await readEvents({ day: dayArg });
  const format = args.includes("--csv") ? "csv" : "json";

  if (args.includes("--summary") || args.length === 0) {
    console.log(JSON.stringify(summarize(events), null, 2));
    return;
  }
  if (args.includes("--export-finops")) {
    const pack = buildFinopsPack(events, { day: dayArg });
    if (format === "csv") process.stdout.write(finopsCsv(pack));
    else console.log(JSON.stringify(pack, null, 2));
    return;
  }
  if (args.includes("--export-security")) {
    const pack = buildSecurityPack(events, { day: dayArg });
    if (format === "csv") process.stdout.write(securityCsv(pack));
    else console.log(JSON.stringify(pack, null, 2));
    return;
  }
  if (args.includes("--export")) {
    for (const e of events) console.log(JSON.stringify(e));
    return;
  }
  if (args.includes("--discovery")) {
    console.log(JSON.stringify(discoveryStatus(events), null, 2));
    return;
  }
  if (args.includes("--unattributed")) {
    console.log(JSON.stringify(unattributedStatus(events), null, 2));
    return;
  }

  if (args.includes("--block-reasons")) {
    console.log(JSON.stringify(blockReasonsStatus(events), null, 2));
    return;
  }
  if (args.includes("--model-spend")) {
    console.log(JSON.stringify(modelSpendStatus(events), null, 2));
    return;
  }
  if (args.includes("--team-spend")) {
    console.log(JSON.stringify(teamSpendStatus(events), null, 2));
    return;
  }
  if (args.includes("--high-cost")) {
    console.log(JSON.stringify(highCostStatus(events), null, 2));
    return;
  }
  if (args.includes("--slow")) {
    console.log(JSON.stringify(slowRequestStatus(events), null, 2));
    return;
  }
  if (args.includes("--token-volume")) {
    console.log(JSON.stringify(tokenVolumeStatus(events), null, 2));
    return;
  }
  if (args.includes("--app-spend")) {
    console.log(JSON.stringify(appSpendStatus(events), null, 2));
    return;
  }
  if (args.includes("--daily-spend")) {
    console.log(JSON.stringify(dailySpendStatus(events), null, 2));
    return;
  }
  if (args.includes("--weekly-spend")) {
    console.log(JSON.stringify(weeklySpendStatus(events), null, 2));
    return;
  }
  if (args.includes("--hourly-spend")) {
    console.log(JSON.stringify(hourlySpendStatus(events), null, 2));
    return;
  }

  if (args.includes("--efficiency")) {
    console.log(JSON.stringify(efficiencyStatus(events), null, 2));
    return;
  }
  if (args.includes("--team-efficiency")) {
    console.log(JSON.stringify(teamEfficiencyStatus(events), null, 2));
    return;
  }
  if (args.includes("--app-efficiency")) {
    console.log(JSON.stringify(appEfficiencyStatus(events), null, 2));
    return;
  }
  if (args.includes("--upstream-efficiency")) {
    console.log(JSON.stringify(upstreamEfficiencyStatus(events), null, 2));
    return;
  }
  if (args.includes("--key-efficiency")) {
    console.log(JSON.stringify(keyEfficiencyStatus(events), null, 2));
    return;
  }
  if (args.includes("--monthly-spend")) {
    console.log(JSON.stringify(monthlySpendStatus(events), null, 2));
    return;
  }
  if (args.includes("--endpoint-spend")) {
    console.log(JSON.stringify(endpointSpendStatus(events), null, 2));
    return;
  }
  if (args.includes("--upstream-spend")) {
    console.log(JSON.stringify(upstreamSpendStatus(events), null, 2));
    return;
  }
  if (args.includes("--blocked-impact")) {
    console.log(JSON.stringify(blockedImpactStatus(events), null, 2));
    return;
  }
  if (args.includes("--alerts")) {
    const summary = await adminSummary({ day: dayArg });
    const wh = webhookStatus();
    let notified: { ok: boolean; status?: number; error?: string } | null = null;
    if (wh.configured) {
      notified = await postAlerts(summary.alerts);
    }
    console.log(JSON.stringify({ alerts: summary.alerts, webhook: { configured: wh.configured, host: wh.host, notified } }, null, 2));
    return;
  }
  const reqArg = args.find((a) => a.startsWith("--request-id="));
  if (reqArg) {
    const requestId = reqArg.slice("--request-id=".length).trim();
    if (!isSafeRequestId(requestId)) {
      console.error("invalid request id (8–64 chars of [A-Za-z0-9._:-])");
      process.exit(1);
    }
    const hits = await findEventsByRequestId(requestId, { day: dayArg });
    console.log(JSON.stringify({ requestId, count: hits.length, events: hits }, null, 2));
    return;
  }
  if (args.includes("--verify-ledger")) {
    const report = verifyChain(events);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exit(1);
    return;
  }
  if (args.includes("--issue-key")) {
    const id = args.find((a) => a.startsWith("--id="))?.slice("--id=".length) ?? "";
    const team = args.find((a) => a.startsWith("--team="))?.slice("--team=".length) ?? "";
    const app = args.find((a) => a.startsWith("--app="))?.slice("--app=".length) ?? "";
    const expiresAt = args.find((a) => a.startsWith("--expires="))?.slice("--expires=".length);
    const issued = await issueClientKey({ id, teamId: team, appId: app, expiresAt });
    console.error("store this token now; only its SHA-256 digest was written");
    console.log(JSON.stringify({ ok: true, id: issued.id, teamId: issued.teamId, appId: issued.appId, expiresAt: issued.expiresAt, token: issued.token, path: issued.path }, null, 2));
    return;
  }
  if (args.includes("--revoke-key")) {
    const id = args.find((a) => a.startsWith("--id="))?.slice("--id=".length) ?? "";
    const revoked = await revokeClientKey(id);
    console.log(JSON.stringify({ ok: true, id: revoked.id, teamId: revoked.teamId, appId: revoked.appId, disabled: true, alreadyDisabled: revoked.alreadyDisabled, path: revoked.path }, null, 2));
    return;
  }
  if (args.includes("--enable-key")) {
    const id = args.find((a) => a.startsWith("--id="))?.slice("--id=".length) ?? "";
    const enabled = await enableClientKey(id);
    console.log(JSON.stringify({ ok: true, id: enabled.id, teamId: enabled.teamId, appId: enabled.appId, disabled: false, alreadyEnabled: enabled.alreadyEnabled, path: enabled.path }, null, 2));
    return;
  }
  if (args.includes("--rotate-key")) {
    const id = args.find((a) => a.startsWith("--id="))?.slice("--id=".length) ?? "";
    const rotated = await rotateClientKey({ id });
    console.error("store this token now; previous digest was replaced and no longer matches");
    console.log(JSON.stringify({ ok: true, id: rotated.id, teamId: rotated.teamId, appId: rotated.appId, expiresAt: rotated.expiresAt, previousDisabled: rotated.previousDisabled, token: rotated.token, path: rotated.path }, null, 2));
    return;
  }
  if (args.includes("--list-keys")) {
    const status = await keyStatus();
    console.log(JSON.stringify({ ok: true, configured: status.configured, enabledCount: status.enabledCount, storesTokenMaterial: status.storesTokenMaterial, keys: status.keys }, null, 2));
    return;
  }
  const noteArg = args.find((a) => a.startsWith("--note="));
  if (noteArg) {
    const team = args.find((a) => a.startsWith("--team="))?.slice("--team=".length);
    const app = args.find((a) => a.startsWith("--app="))?.slice("--app=".length);
    const event = await appendOperatorNote({ text: noteArg.slice("--note=".length), teamId: team, appId: app });
    console.log(JSON.stringify({ ok: true, id: event.id, decision: event.decision, note: event.note }, null, 2));
    return;
  }
  console.error("usage: tsx src/cli.ts [--summary|--export|--export-finops|--export-security|--discovery|--unattributed|--alerts|--block-reasons|--model-spend|--team-spend|--app-spend|--daily-spend|--weekly-spend|--hourly-spend|--efficiency|--team-efficiency|--app-efficiency|--upstream-efficiency|--key-efficiency|--monthly-spend|--endpoint-spend|--upstream-spend|--blocked-impact|--high-cost|--slow|--token-volume|--verify-ledger|--request-id=id|--issue-key --id= --team= --app= [--expires=YYYY-MM-DD]|--revoke-key --id=|--enable-key --id=|--rotate-key --id=|--list-keys|--note=text] [--team=id] [--app=id] [--csv] [--day=YYYY-MM-DD]");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
