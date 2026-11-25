import type { UsageEvent } from "./types.js";
import { recordingChecklist } from "./recordingChecklist.js";
import { outreachDraft } from "./outreachDraft.js";

export type SaleReadyItem = {
  id: string;
  label: string;
  done: boolean;
  detail: string;
};

export type SaleReadyStatus = {
  version: "tokenpulse-sale-ready-v1";
  ready: boolean;
  items: SaleReadyItem[];
  nextAction: string;
  buyerDraftsReady: number;
};

/** Sale readiness visibility. Does not change policy. Recording remains the operator gate. */
export function saleReadyStatus(events: UsageEvent[]): SaleReadyStatus {
  const checklist = recordingChecklist(events);
  const buyers = ["palo-alto", "cisco", "crowdstrike", "doit", "default"];
  const drafts = buyers.map((b) => outreachDraft(events, b));
  const draftsReady = drafts.filter((d) => d.subject && d.body && d.body.length > 80).length;

  const items: SaleReadyItem[] = [
    {
      id: "materials",
      label: "Sale materials in repo",
      done: true,
      detail: "SALE.md, BUYERS.md, OUTREACH.md, OUTREACH_DRAFTS.md present",
    },
    {
      id: "recording-aids",
      label: "Recording aids on dashboard",
      done: checklist.ready,
      detail: checklist.nextAction,
    },
    {
      id: "outreach-drafts",
      label: "Outreach drafts available",
      done: draftsReady >= 3,
      detail: `${draftsReady}/${buyers.length} buyer drafts ready to copy`,
    },
    {
      id: "operator-recording",
      label: "DEMO.md recording completed",
      done: false, // operator gate; automation cannot record
      detail: "Operator must record the mock demo (no keys on camera) then personalize emails",
    },
  ];

  const ready = items.every((i) => i.done);
  const next = ready
    ? "Personalize ≤10 emails from the dashboard drafts and send. Track replies."
    : "Redeploy, confirm dashboard, record DEMO.md, then use Outreach drafts card.";

  return {
    version: "tokenpulse-sale-ready-v1",
    ready,
    items,
    nextAction: next,
    buyerDraftsReady: draftsReady,
  };
}
