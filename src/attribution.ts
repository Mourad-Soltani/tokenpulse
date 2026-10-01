export type AttributionField = {
  header: string;
  ledgerField: "teamId" | "appId";
  defaultValue: string;
  required: false;
};

export type AttributionStatus = {
  version: "tokenpulse-attribution-v1";
  storesRawPrompts: false;
  fieldCount: number;
  fields: AttributionField[];
  notes: string;
};

/** How spend is attributed. Header values only; no API-key mapping in v0.1. */
export const ATTRIBUTION_FIELDS: AttributionField[] = [
  {
    header: "X-Tokenpulse-Team",
    ledgerField: "teamId",
    defaultValue: "default",
    required: false,
  },
  {
    header: "X-Tokenpulse-App",
    ledgerField: "appId",
    defaultValue: "default",
    required: false,
  },
];

/** Operator-visible attribution contract. Never serializes header values from traffic. */
export function attributionStatus(): AttributionStatus {
  return {
    version: "tokenpulse-attribution-v1",
    storesRawPrompts: false,
    fieldCount: ATTRIBUTION_FIELDS.length,
    fields: ATTRIBUTION_FIELDS,
    notes: "Missing headers use default. App spend/RPM/size caps key off appId across teams.",
  };
}
