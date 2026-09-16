import { readEvents, summarize } from "./ledger.js";
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
  console.error("usage: tsx src/cli.ts [--summary|--export|--export-finops|--export-security] [--csv] [--day=YYYY-MM-DD]");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
