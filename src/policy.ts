export type PolicyStage = {
  order: number;
  id: string;
  name: string;
  onDeny: string;
  appliesTo: string[];
};

export type PolicyPipelineStatus = {
  version: "tokenpulse-policy-v1";
  storesRawPrompts: false;
  stageCount: number;
  stages: PolicyStage[];
};

/** Evaluation order used by the gateway after auth. Deny short-circuits. */
export const POLICY_STAGES: PolicyStage[] = [
  {
    order: 1,
    id: "limits",
    name: "request size",
    onDeny: "413 limit_exceeded",
    appliesTo: ["chat", "embeddings"],
  },
  {
    order: 2,
    id: "sensitive",
    name: "sensitive payload",
    onDeny: "403 sensitive_payload",
    appliesTo: ["chat", "embeddings"],
  },
  {
    order: 3,
    id: "model",
    name: "model allow/deny",
    onDeny: "403 model_denied",
    appliesTo: ["chat", "embeddings"],
  },
  {
    order: 4,
    id: "remap",
    name: "model remap",
    onDeny: "none",
    appliesTo: ["chat", "embeddings"],
  },
  {
    order: 5,
    id: "rate",
    name: "RPM",
    onDeny: "429 rate_limited",
    appliesTo: ["chat", "embeddings"],
  },
  {
    order: 6,
    id: "budget",
    name: "daily/monthly spend",
    onDeny: "429 budget_exceeded",
    appliesTo: ["chat", "embeddings"],
  },
  {
    order: 7,
    id: "upstream",
    name: "mock or live hop",
    onDeny: "501/502 upstream_error",
    appliesTo: ["chat", "embeddings"],
  },
];

/** Operator-visible pipeline. No request bodies or keys. */
export function policyPipelineStatus(): PolicyPipelineStatus {
  return {
    version: "tokenpulse-policy-v1",
    storesRawPrompts: false,
    stageCount: POLICY_STAGES.length,
    stages: POLICY_STAGES,
  };
}
