import type { UsageEvent } from "./types.js";

export type DemoReadyStatus = {
  version: "tokenpulse-demo-ready-v1";
  ready: boolean;
  allowCount: number;
  blockCount: number;
  uniqueTeams: number;
  uniqueModels: number;
  uniqueApps: number;
  daySpan: number;
  notes: string[];
};

/** Operator check: is the ledger rich enough for a convincing DEMO.md recording? */
export function demoReadyStatus(events: UsageEvent[]): DemoReadyStatus {
  const allows = events.filter((e) => e.decision === "allow");
  const blocks = events.filter((e) => e.decision === "block");
  const teams = new Set(events.map((e) => e.teamId || "default").filter(Boolean));
  const models = new Set(events.map((e) => e.model).filter(Boolean));
  const apps = new Set(events.map((e) => e.appId || "default").filter(Boolean));
  const days = new Set(
    events
      .map((e) => {
        const d = new Date(e.timestamp || "");
        return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
      })
      .filter(Boolean) as string[]
  );
  const notes: string[] = [];
  if (allows.length < 20) notes.push("Few allowed events — run --seed-demo for richer tables.");
  if (blocks.length < 5) notes.push("Few blocked events — policy tables will look empty.");
  if (teams.size < 3) notes.push("Only one or two teams — attribution story is thin.");
  if (models.size < 2) notes.push("Single model — efficiency and spend ranking less interesting.");
  if (days.size < 7) notes.push("Short day span — daily/weekly tables look sparse.");
  const ready = notes.length === 0;
  if (ready) notes.push("Ledger looks ready for recording. No raw prompts stored.");
  return {
    version: "tokenpulse-demo-ready-v1",
    ready,
    allowCount: allows.length,
    blockCount: blocks.length,
    uniqueTeams: teams.size,
    uniqueModels: models.size,
    uniqueApps: apps.size,
    daySpan: days.size,
    notes,
  };
}
