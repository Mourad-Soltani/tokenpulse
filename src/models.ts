import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { catalogModelIds } from "./pricing.js";

export const ModelPolicySchema = z.object({
  allow: z.array(z.string().min(1)).optional(),
  deny: z.array(z.string().min(1)).optional(),
});

export type ModelPolicy = z.infer<typeof ModelPolicySchema>;

export type ModelDecision = {
  allow: boolean;
  model: string;
  policyId: string;
  reason?: string;
};

function splitCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function modelsPath(): string {
  return process.env.TOKENPULSE_MODELS_PATH ?? join(process.cwd(), "data", "models.json");
}

export async function loadModelPolicy(): Promise<ModelPolicy> {
  let fileCfg: ModelPolicy = {};
  try {
    const raw = await readFile(modelsPath(), "utf8");
    const parsed = ModelPolicySchema.safeParse(JSON.parse(raw));
    if (parsed.success) fileCfg = parsed.data;
  } catch {
    // missing or invalid file = no file-level lists
  }
  const envAllow = splitCsv(process.env.TOKENPULSE_MODEL_ALLOW);
  const envDeny = splitCsv(process.env.TOKENPULSE_MODEL_DENY);
  return {
    allow: envAllow.length ? envAllow : fileCfg.allow,
    deny: envDeny.length ? envDeny : fileCfg.deny,
  };
}

export function evaluateModel(model: string, policy: ModelPolicy): ModelDecision {
  const deny = policy.deny ?? [];
  const allow = policy.allow ?? [];
  if (deny.includes(model)) {
    return {
      allow: false,
      model,
      policyId: "model-deny",
      reason: `model ${model} is denied`,
    };
  }
  if (allow.length > 0 && !allow.includes(model)) {
    return {
      allow: false,
      model,
      policyId: "model-allowlist",
      reason: `model ${model} is not on the allow list`,
    };
  }
  if (allow.length > 0) {
    return { allow: true, model, policyId: "model-allowlist" };
  }
  if (deny.length > 0) {
    return { allow: true, model, policyId: "model-deny" };
  }
  return { allow: true, model, policyId: "model-open" };
}

export async function evaluateModelPolicy(model: string): Promise<ModelDecision> {
  const policy = await loadModelPolicy();
  return evaluateModel(model, policy);
}

export type ListedModel = {
  id: string;
  object: "model";
  created: number;
  owned_by: "tokenpulse";
};

/** Catalog ids that pass the current allow/deny policy. Allow-list models not in the pricing table are still listed. */
export function listVisibleModels(policy: ModelPolicy, created = 0): ListedModel[] {
  const fromCatalog = catalogModelIds().filter((id) => evaluateModel(id, policy).allow);
  const extra = (policy.allow ?? []).filter((id) => !fromCatalog.includes(id) && evaluateModel(id, policy).allow);
  const ids = [...fromCatalog, ...extra].sort();
  return ids.map((id) => ({
    id,
    object: "model" as const,
    created,
    owned_by: "tokenpulse" as const,
  }));
}

export async function listVisibleModelsAsync(): Promise<ListedModel[]> {
  const policy = await loadModelPolicy();
  return listVisibleModels(policy);
}
