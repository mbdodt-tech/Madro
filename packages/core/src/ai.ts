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

export const aiResultSchemas = {
  ping: z.object({ pong: z.literal(true), time: z.string() }),
  parse_meal: z.object({
    items: z.array(parsedMealItemSchema).min(1).max(8),
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
