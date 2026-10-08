import { appendOperatorNote, findEventsByRequestId, readEvents, summarize, verifyChain } from "./ledger.js";
import { enableClientKey, issueClientKey, keyStatus, revokeClientKey, rotateClientKey } from "./keys.js";
import { isSafeRequestId } from "./correlation.js";
import { buildFinopsPack, buildSecurityPack, finopsCsv, securityCsv } from "./export.js";

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
  console.error("usage: tsx src/cli.ts [--summary|--export|--export-finops|--export-security|--verify-ledger|--request-id=id|--issue-key --id= --team= --app= [--expires=YYYY-MM-DD]|--revoke-key --id=|--enable-key --id=|--rotate-key --id=|--list-keys|--note=text] [--team=id] [--app=id] [--csv] [--day=YYYY-MM-DD]");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
