import { z } from "zod";

/**
 * Klient til AI-gatewayen (supabase/functions/ai) — eneste vej til AI
 * i appen. Transporten er injiceret, så pakken forbliver ren logik.
 */

export const aiResultSchemas = {
  ping: z.object({ pong: z.literal(true), time: z.string() }),
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
    async callAi(task, payload) {
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
      return result.data;
    },
  };
}
