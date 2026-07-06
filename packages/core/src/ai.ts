import { z } from "zod";

/**
 * Klient til AI-gatewayen (supabase/functions/ai) — eneste vej til AI
 * i appen. Transporten er injiceret, så pakken forbliver ren logik.
 */

/** Én foreslået post fra naturligt-sprog-parsingen (fase 2.1). */
export const parsedMealItemSchema = z.object({
  /** Fødevarenavn på beskrivelsens sprog, fx "rugbrød". */
  name: z.string().min(1).max(80),
  /** Skønnet portion i gram (husholdningsmål omregnet af modellen). */
  grams: z.number().min(1).max(2000),
  /** Valgfri note, fx "2 skiver". */
  note: z.string().max(120).optional(),
});

export type ParsedMealItem = z.infer<typeof parsedMealItemSchema>;

/** Udtræk fra et foto af en varedeklaration (fase 2.3). Alt er valgfrit —
 *  kun hvad der faktisk kunne læses; ingen gæt. */
export const parsedLabelSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  brand: z.string().min(1).max(120).optional(),
  ingredients_text: z.string().max(4000).optional(),
  /** Normaliserede E-numre, fx "e330". */
  additives: z.array(z.string().regex(/^e\d{3,4}[a-z]?$/)).max(40).default([]),
  /** NOVA-skøn ud fra ingredienslisten; udelades hvis usikkert. */
  nova_group: z.number().int().min(1).max(4).optional(),
  /** Deklarationens tal pr. 100 g. */
  nutriments: z
    .object({
      energy_kcal: z.number().min(0).max(950).optional(),
      fat_g: z.number().min(0).max(100).optional(),
      saturated_fat_g: z.number().min(0).max(100).optional(),
      carbohydrate_g: z.number().min(0).max(100).optional(),
      sugars_g: z.number().min(0).max(100).optional(),
      fiber_g: z.number().min(0).max(100).optional(),
      protein_g: z.number().min(0).max(100).optional(),
      salt_g: z.number().min(0).max(100).optional(),
    })
    .default({}),
});

export type ParsedLabel = z.infer<typeof parsedLabelSchema>;

export const aiResultSchemas = {
  ping: z.object({ pong: z.literal(true), time: z.string() }),
  parse_meal: z.object({
    items: z.array(parsedMealItemSchema).min(1).max(8),
  }),
  parse_label: parsedLabelSchema,
  /** Foto af tallerken (fase 2.2). 0 items tilladt = ingen mad genkendt. */
  parse_photo_meal: z.object({
    items: z.array(parsedMealItemSchema).max(8),
  }),
  /** Ugens fortælling + forslag (fase 2.4). Aldrig moraliserende. */
  weekly_insight: z.object({
    narrative: z.string().min(1).max(600),
    suggestions: z
      .array(
        z.object({
          food: z.string().min(1).max(80),
          reason: z.string().min(1).max(200),
        }),
      )
      .max(4),
  }),
} as const;

export type AiTask = keyof typeof aiResultSchemas;

export type AiResult<T extends AiTask> = z.infer<(typeof aiResultSchemas)[T]>;

const errorEnvelope = z.object({ error: z.object({ code: z.string() }) });
const dataEnvelope = z.object({ data: z.unknown() });

export class AiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(`AI gateway error: ${code} (${status})`);
    this.name = "AiError";
  }
}

export interface AiClientOptions {
  /** Supabase-projektets URL, fx https://xyz.supabase.co */
  url: string;
  /** Publishable/anon key (aldrig service role). */
  anonKey: string;
  /** Leverer brugerens access token — null når ikke logget ind. */
  getAccessToken: () => Promise<string | null>;
  /** Injicérbar fetch (test). */
  fetchFn?: typeof fetch;
}

export interface AiClient {
  callAi<T extends AiTask>(
    task: T,
    payload: Record<string, unknown>,
  ): Promise<AiResult<T>>;
}

export function createAiClient(options: AiClientOptions): AiClient {
  const doFetch = options.fetchFn ?? fetch;

  return {
    async callAi<T extends AiTask>(
      task: T,
      payload: Record<string, unknown>,
    ): Promise<AiResult<T>> {
      const token = await options.getAccessToken();
      if (!token) throw new AiError("not_authenticated", 401);

      const response = await doFetch(`${options.url}/functions/v1/ai`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: options.anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ task, payload }),
      });

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new AiError("invalid_response", response.status);
      }

      if (!response.ok) {
        const parsed = errorEnvelope.safeParse(body);
        throw new AiError(
          parsed.success ? parsed.data.error.code : "unknown_error",
          response.status,
        );
      }

      const parsed = dataEnvelope.safeParse(body);
      if (!parsed.success) throw new AiError("invalid_response", response.status);

      const result = aiResultSchemas[task].safeParse(parsed.data.data);
      if (!result.success) throw new AiError("invalid_result", response.status);
      // Skemaet er valgt pr. task, så outputtet ER AiResult<T> — TS kan
      // bare ikke narrowe unionen over den generiske nøgle.
      return result.data as AiResult<T>;
    },
  };
}
