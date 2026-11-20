import type { UsageEvent } from "./types.js";
import { demoReadyStatus } from "./demoReady.js";
import { policyRoiStatus } from "./policyRoi.js";
import { annualProjectionStatus } from "./annualProjection.js";
import { annualAvoidedStatus } from "./annualAvoided.js";
import { scaleModelStatus } from "./scaleModel.js";
import { buyerBrief } from "./buyerBrief.js";
import { recordingTalkingPoints } from "./recordingTalkingPoints.js";

export type RecordingPack = {
  version: "tokenpulse-recording-pack-v1";
  ready: boolean;
  summary: {
    allowCount: number;
    blockCount: number;
    daySpan: number;
    policyRoiPct: number;
    annualProjectedUsd: number;
    annualAvoidedUsd: number;
    scaleMonthlyAvoidedUsd: number;
  };
  talkingPoints: string[];
  cfoLine: string;
  assumptions: string[];
  notes: string[];
};

/** Single-page pack for the operator while recording DEMO.md. Visibility only. */
export function recordingPack(events: UsageEvent[], opts?: { monthlyRequests?: number }): RecordingPack {
  const ready = demoReadyStatus(events);
  const roi = policyRoiStatus(events);
  const annual = annualProjectionStatus(events);
  const avoided = annualAvoidedStatus(events);
  const scale = scaleModelStatus(events, { monthlyRequests: opts?.monthlyRequests });
  const brief = buyerBrief(events);
  const points = recordingTalkingPoints(events, { monthlyRequests: opts?.monthlyRequests });

  return {
    version: "tokenpulse-recording-pack-v1",
    ready: ready.ready,
    summary: {
      allowCount: ready.allowCount,
      blockCount: ready.blockCount,
      daySpan: ready.daySpan,
      policyRoiPct: roi.avoidedPct,
      annualProjectedUsd: annual.projectedAnnualUsd,
      annualAvoidedUsd: avoided.projectedAnnualAvoidedUsd,
      scaleMonthlyAvoidedUsd: scale.projectedMonthlyAvoidedUsd,
    },
    talkingPoints: points.script ?? [],
    cfoLine: points.cfoLine ?? "",
    assumptions: scale.assumptions ?? [],
    notes: ready.notes,
  };
}
