export type SensitiveHit = {
  category: string;
};

export type SensitiveDecision = {
  allow: boolean;
  policyId: string;
  reason?: string;
  categories: string[];
};

const DISABLED = new Set(["0", "false", "off", "no"]);

function enabled(): boolean {
  const raw = (process.env.TOKENPULSE_SENSITIVE ?? "on").trim().toLowerCase();
  return !DISABLED.has(raw);
}

/** Extract text only. Callers must not persist this string. */
export function extractMessageText(messages: { content?: string }[]): string {
  return messages.map((m) => m.content ?? "").join("\n");
}

const DETECTORS: { category: string; re: RegExp }[] = [
  { category: "secret", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { category: "secret", re: /\bghp_[A-Za-z0-9]{20,}\b/ },
  { category: "secret", re: /\bsk-[A-Za-z0-9_-]{16,}\b/ },
  { category: "secret", re: /\bxai-[A-Za-z0-9_-]{16,}\b/ },
  { category: "secret", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { category: "secret", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { category: "secret", re: /\bBearer\s+[A-Za-z0-9._\-+=/]{16,}\b/i },
  { category: "secret", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { category: "pii", re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { category: "pii", re: /\b(?:\d{3}-?\d{2}-?\d{4})\b/ },
  { category: "pii", re: /\b(?:\d[ -]*?){13,19}\b/ },
];

function extraPatterns(): RegExp[] {
  const raw = process.env.TOKENPULSE_SENSITIVE_EXTRA ?? "";
  if (!raw.trim()) return [];
  return raw
    .split(";;")
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => {
      try {
        return [new RegExp(p, "i")];
      } catch {
        return [];
      }
    });
}

export function scanText(text: string): SensitiveHit[] {
  const hits: SensitiveHit[] = [];
  const seen = new Set<string>();
  for (const d of DETECTORS) {
    d.re.lastIndex = 0;
    if (d.re.test(text) && !seen.has(d.category)) {
      seen.add(d.category);
      hits.push({ category: d.category });
    }
  }
  for (const re of extraPatterns()) {
    re.lastIndex = 0;
    if (re.test(text) && !seen.has("custom")) {
      seen.add("custom");
      hits.push({ category: "custom" });
    }
  }
  return hits;
}

export function evaluateSensitive(messages: { content?: string }[]): SensitiveDecision {
  if (!enabled()) {
    return { allow: true, policyId: "sensitive-off", categories: [] };
  }
  const text = extractMessageText(messages);
  const hits = scanText(text);
  if (hits.length === 0) {
    return { allow: true, policyId: "sensitive-clear", categories: [] };
  }
  const categories = hits.map((h) => h.category);
  return {
    allow: false,
    policyId: "sensitive-block",
    reason: `sensitive payload blocked (${categories.join(",")})`,
    categories,
  };
}
