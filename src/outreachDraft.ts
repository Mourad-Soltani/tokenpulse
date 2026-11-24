import type { UsageEvent } from "./types.js";
import { outreachSnippet } from "./outreachSnippet.js";

export type OutreachDraft = {
  version: "tokenpulse-outreach-draft-v1";
  buyer: string;
  subject: string;
  body: string;
  snippetUsed: boolean;
  note: string;
};

const TEMPLATES: Record<string, { subject: string; opener: string }> = {
  "palo-alto": {
    subject: "Sovereign FinOps-hard complement for Prisma AIRS AI Gateway",
    opener: "Tokenpulse is a self-hosted OpenAI-compatible gateway that meters tokens, attributes spend to team/app, and hard-blocks requests that violate budget, model, rate, or sensitive-payload policy before they leave the network.",
  },
  "cisco": {
    subject: "Request-path meter + budget block next to Splunk Tokenomics / Galileo",
    opener: "Tokenpulse sits on the request path of OpenAI-compatible LLM traffic: it meters tokens, attributes spend to team/app, and blocks (budget / model / rate / sensitive) before egress.",
  },
  "crowdstrike": {
    subject: "Lightweight self-hosted complement for Falcon Guardian AI Gateway",
    opener: "Tokenpulse is a small self-hosted OpenAI-compatible proxy that enforces budget, model allow/deny, rate, and sensitive-payload policy before any call reaches the provider, then writes a hash-chained usage event.",
  },
  "doit": {
    subject: "Self-hosted AI FinOps control plane for Attribute / DoiT customers",
    opener: "Tokenpulse is a self-hosted OpenAI-compatible gateway focused on hard budget/policy enforcement and append-only FinOps + CISO audit packs.",
  },
  default: {
    subject: "Self-hosted AI FinOps + shadow-AI control plane (demo numbers)",
    opener: "Tokenpulse is a self-hosted OpenAI-compatible gateway that meters tokens, attributes spend, enforces budget/data policy at the edge, and exports audit packs for CFO and CISO.",
  },
};

/** Generates a paste-ready personalized outreach email that injects the current outreach snippet. */
export function outreachDraft(events: UsageEvent[], buyerRaw: string): OutreachDraft {
  const key = buyerRaw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "default";
  const tmpl = TEMPLATES[key] ?? TEMPLATES.default;
  const snip = outreachSnippet(events);

  const body = `Hi {{Name}},

${tmpl.opener}

${snip.body}

I can send a 3-minute mock demo recording (no keys) or jump on a short technical call. Repo: https://github.com/Mourad-Soltani/tokenpulse

Best,
Mourad Soltani`;

  return {
    version: "tokenpulse-outreach-draft-v1",
    buyer: key,
    subject: tmpl.subject,
    body,
    snippetUsed: true,
    note: "Fill {{Name}}. Do not send until DEMO.md recording exists. Numbers from current ledger. No secrets.",
  };
}
