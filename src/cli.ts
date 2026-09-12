import { readEvents, summarize } from "./ledger.js";

async function main() {
  const args = process.argv.slice(2);
  const events = await readEvents();
  if (args.includes("--summary") || args.length === 0) {
    console.log(JSON.stringify(summarize(events), null, 2));
    return;
  }
  if (args.includes("--export")) {
    for (const e of events) console.log(JSON.stringify(e));
    return;
  }
  console.error("usage: tsx src/cli.ts [--summary|--export]");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
