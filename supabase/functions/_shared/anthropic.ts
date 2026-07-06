// Delt Anthropic-hjælper — bruges KUN af gateway-funktionen `ai`
// (CLAUDE.md: al AI går gennem én indgang; nøglen findes kun i
// Edge Function-secrets som ANTHROPIC_API_KEY).
//
// Første kaldende task: parse_meal (fase 2.1).

import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import type { z } from "npm:zod@3.23.8";

/**
 * Tone-guardrails der bages ind i ALLE prompts (CLAUDE.md AI-regler):
 * neutral og støttende, aldrig "farlig"/"dangerous", ingen individuelle
 * medicinske råd/diagnoser, referér navngivne systemer frem for egne domme.
 */
const BASE_SYSTEM = `Du er en neutral, stottende ernaeringsassistent i appen Madro.
Regler, der ALTID gaelder:
- Brug aldrig ord som "farlig", "dangerous" eller skraemmende sprog om mad.
- Giv aldrig individuelle medicinske raad eller diagnoser.
- Henvis til navngivne systemer (NOVA, Nutri-Score, EFSA) frem for egne vurderinger.
- Tonen er varm, saglig og aldrig moraliserende. Ingen skyld, ingen "god/daarlig mad".
- Svar KUN med gyldig JSON efter det angivne skema - ingen forklarende tekst, ingen kodeblokke.`;

export interface AskClaudeOptions<T> {
  /** Task-specifik system-instruks (tilføjes efter guardrails). */
  system?: string;
  /** Brugerindhold (payload-afledt — logges aldrig). */
  user: string;
  /** Valgfrit billede (vision-tasks, fx parse_label). Persisteres aldrig. */
  imageBase64?: string;
  imageMediaType?: "image/jpeg" | "image/png";
  /** Zod-skema som svaret valideres imod. */
  schema: z.ZodType<T>;
  model?: string;
  maxTokens?: number;
}

/** Fjern evt. ```json-hegn før parsing (CLAUDE.md: strip fences). */
function stripFences(text: string): string {
  return text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

export async function askClaude<T>(options: AskClaudeOptions<T>): Promise<T> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("missing_anthropic_key");

  const client = new Anthropic({ apiKey });

  const content: Anthropic.ContentBlockParam[] = options.imageBase64
    ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: options.imageMediaType ?? "image/jpeg",
            data: options.imageBase64,
          },
        },
        { type: "text", text: options.user },
      ]
    : [{ type: "text", text: options.user }];

  const response = await client.messages.create({
    model: options.model ?? "claude-opus-4-8",
    max_tokens: options.maxTokens ?? 4096,
    system: options.system
      ? `${BASE_SYSTEM}\n\n${options.system}`
      : BASE_SYSTEM,
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("model_refusal");
  }

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => ("text" in block ? block.text : ""))
    .join("");

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch {
    throw new Error("invalid_model_json");
  }

  return options.schema.parse(parsed);
}
