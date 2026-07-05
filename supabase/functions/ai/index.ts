// AI-gateway (fase-tjekliste 0.6) — ENESTE indgang til Anthropic API.
// Pipeline: preflight → auth → envelope-validering → rate-limit → task.
// GDPR-regel: payload-indhold logges ALDRIG (kun task-navn, bruger-id, udfald).

import { createClient } from "npm:@supabase/supabase-js@2.47.10";
import { z } from "npm:zod@3.23.8";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";

const RATE_LIMIT_PER_MINUTE = 20;

const envelopeSchema = z.object({
  task: z.string().min(1).max(64),
  payload: z.unknown(),
});

/** Task-registret: zod-skema for payload + handler. Fase 2 tilføjer
 *  Anthropic-kaldende tasks via askClaude fra ../_shared/anthropic.ts. */
const tasks: Record<
  string,
  {
    schema: z.ZodType<unknown>;
    handler: (payload: unknown, userId: string) => Promise<unknown>;
  }
> = {
  ping: {
    schema: z.object({}).strict(),
    handler: () => Promise.resolve({ pong: true, time: new Date().toISOString() }),
  },
};

function error(req: Request, status: number, code: string): Response {
  return jsonResponse(req, status, { error: { code } });
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return error(req, 405, "method_not_allowed");

  // ---- Auth: kun indloggede brugere ----
  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return error(req, 401, "unauthorized");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: userData, error: userError } = await anonClient.auth.getUser(jwt);
  if (userError || !userData.user) return error(req, 401, "unauthorized");
  const userId = userData.user.id;

  // ---- Envelope ----
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error(req, 400, "invalid_json");
  }
  const envelope = envelopeSchema.safeParse(body);
  if (!envelope.success) return error(req, 400, "invalid_envelope");

  const task = tasks[envelope.data.task];
  if (!task) return error(req, 400, "unknown_task");

  // ---- Rate limit (service role; RLS-lukket tabel) ----
  const serviceClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count, error: countError } = await serviceClient
    .from("ai_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneMinuteAgo);

  if (countError) {
    console.error(`ai task=${envelope.data.task} user=${userId} outcome=rate_check_failed`);
    return error(req, 500, "internal");
  }
  if ((count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
    console.warn(`ai task=${envelope.data.task} user=${userId} outcome=rate_limited`);
    return error(req, 429, "rate_limited");
  }

  await serviceClient
    .from("ai_requests")
    .insert({ user_id: userId, task: envelope.data.task });
  // Opportunistisk oprydning af gamle rækker (fire-and-forget).
  void serviceClient
    .from("ai_requests")
    .delete()
    .lt("created_at", new Date(Date.now() - 3_600_000).toISOString())
    .then(() => undefined);

  // ---- Task ----
  const payload = task.schema.safeParse(envelope.data.payload);
  if (!payload.success) return error(req, 400, "invalid_payload");

  try {
    const data = await task.handler(payload.data, userId);
    console.info(`ai task=${envelope.data.task} user=${userId} outcome=ok`);
    return jsonResponse(req, 200, { data });
  } catch (err) {
    // Aldrig payload-indhold i logs — kun fejlklassen.
    const code = err instanceof Error ? err.message : "internal";
    console.error(`ai task=${envelope.data.task} user=${userId} outcome=error code=${code}`);
    return error(req, 500, "internal");
  }
});
