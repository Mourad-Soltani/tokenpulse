import { appendOperatorNote, readEvents, summarize, verifyChain } from "./ledger.js";
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
  if (args.includes("--verify-ledger")) {
    const report = verifyChain(events);
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exit(1);
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
  console.error("usage: tsx src/cli.ts [--summary|--export|--export-finops|--export-security|--verify-ledger|--note=text] [--team=id] [--app=id] [--csv] [--day=YYYY-MM-DD]");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
