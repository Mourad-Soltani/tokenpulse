import type { UsageEvent } from "./types.js";
import { demoReadyStatus } from "./demoReady.js";
import { recordingPack } from "./recordingPack.js";
import { outreachSnippet } from "./outreachSnippet.js";

export type RecordingChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  detail: string;
};

export type RecordingChecklist = {
  version: "tokenpulse-recording-checklist-v1";
  ready: boolean;
  items: RecordingChecklistItem[];
  nextAction: string;
};

/** Operator checklist before recording DEMO.md. Visibility only. */
export function recordingChecklist(events: UsageEvent[]): RecordingChecklist {
  const ready = demoReadyStatus(events);
  const pack = recordingPack(events);
  const snip = outreachSnippet(events);

  const items: RecordingChecklistItem[] = [
    {
      id: "ledger-rich",
      label: "Seeded ledger is rich enough",
      done: ready.ready,
      detail: ready.notes[0] ?? "—",
    },
    {
      id: "recording-pack",
      label: "Recording pack available",
      done: Boolean(pack.cfoLine || (pack.talkingPoints && pack.talkingPoints.length)),
      detail: pack.ready ? "Pack ready" : "Pack incomplete",
    },
    {
      id: "outreach-snippet",
      label: "Outreach snippet generated",
      done: Boolean(snip.text && snip.text.length > 40),
      detail: snip.text ? "Snippet ready to copy" : "No snippet text",
    },
    {
      id: "dashboard-open",
      label: "Dashboard reachable (operator)",
      done: true, // operator confirms after hard-refresh
      detail: "Hard-refresh after redeploy; confirm cards fill",
    },
    {
      id: "no-secrets",
      label: "No keys on camera",
      done: true,
      detail: "Mock upstream only; never show provider keys or PATs",
    },
  ];

  const readyAll = items.every((i) => i.done);
  const next = readyAll
    ? "Record DEMO.md using Copy all or Download .md, then personalize ≤10 emails from OUTREACH_DRAFTS.md"
    : items.find((i) => !i.done)?.label ?? "Complete remaining items";

  return {
    version: "tokenpulse-recording-checklist-v1",
    ready: readyAll,
    items,
    nextAction: next,
  };
}
