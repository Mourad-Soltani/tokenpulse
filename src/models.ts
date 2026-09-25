import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { catalogModelIds } from "./pricing.js";

export const ModelPolicySchema = z.object({
  allow: z.array(z.string().min(1)).optional(),
  deny: z.array(z.string().min(1)).optional(),
  /** Client model id → upstream model id. Policy still evaluates the client id. */
  remap: z.record(z.string().min(1), z.string().min(1)).optional(),
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

/** `from:to,from2:to2` — later pairs win on duplicate from. */
export function parseRemapCsv(raw: string | undefined): Record<string, string> {
  if (!raw?.trim()) return {};
  const out: Record<string, string> = {};
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx <= 0 || idx === trimmed.length - 1) continue;
    const from = trimmed.slice(0, idx).trim();
    const to = trimmed.slice(idx + 1).trim();
    if (from && to) out[from] = to;
  }
  return out;
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
  const envRemap = parseRemapCsv(process.env.TOKENPULSE_MODEL_REMAP);
  return {
    allow: envAllow.length ? envAllow : fileCfg.allow,
    deny: envDeny.length ? envDeny : fileCfg.deny,
    remap: Object.keys(envRemap).length ? envRemap : fileCfg.remap,
  };
}

export type ModelRemap = {
  clientModel: string;
  upstreamModel: string;
  remapped: boolean;
  policyId?: string;
};

/** After allow/deny on the client model, optionally rewrite the id sent upstream. */
export function resolveRemap(clientModel: string, policy: ModelPolicy): ModelRemap {
  const target = policy.remap?.[clientModel];
  if (!target || target === clientModel) {
    return { clientModel, upstreamModel: clientModel, remapped: false };
  }
  return {
    clientModel,
    upstreamModel: target,
    remapped: true,
    policyId: `remap:${clientModel}:${target}`,
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

export async function resolveRemapFor(clientModel: string): Promise<ModelRemap> {
  const policy = await loadModelPolicy();
  return resolveRemap(clientModel, policy);
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
