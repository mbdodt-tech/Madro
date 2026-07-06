// Konto-funktionen (fase 4.2) — GDPR-sletning af ALT brugerens data.
// Pipeline: preflight → auth → action. Payload-indhold logges aldrig
// (kun bruger-id og udfald). Eksport sker client-side via RLS — denne
// funktion håndterer kun det, klienten ikke selv må: fuld sletning.

import { createClient } from "npm:@supabase/supabase-js@2.47.10";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";

function error(req: Request, status: number, code: string): Response {
  return jsonResponse(req, status, { error: { code } });
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return error(req, 405, "method_not_allowed");

  // ---- Auth: brugeren kan kun slette sig selv ----
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return error(req, 401, "unauthorized");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: userData, error: userError } = await anonClient.auth.getUser(jwt);
  if (userError || !userData.user) return error(req, 401, "unauthorized");
  const userId = userData.user.id;

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return error(req, 400, "invalid_json");
  }
  if (body.action !== "delete") return error(req, 400, "unknown_action");

  const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // 1) Brugerens rækker i alle tabeller (rækkefølgen respekterer FK'er:
    //    log_entries/recommendations refererer scans).
    const tables = [
      "log_entries",
      "recommendations",
      "scans",
      "daily_summaries",
      "insights",
      "body_metrics",
      "activity_days",
      "ai_requests",
    ] as const;
    for (const table of tables) {
      const { error: delError } = await service.from(table).delete().eq("user_id", userId);
      if (delError) throw new Error(`delete_${table}`);
    }
    // Egne custom-fødevarer (owner_id; delte kilders rækker røres ikke).
    const { error: foodsError } = await service
      .from("foods")
      .delete()
      .eq("owner_id", userId)
      .eq("source", "custom");
    if (foodsError) throw new Error("delete_foods");

    // 2) Måltidsfotos i den private bucket (mappen <uid>/…).
    const { data: files } = await service.storage.from("meal-photos").list(userId, {
      limit: 1000,
    });
    if (files && files.length > 0) {
      await service.storage
        .from("meal-photos")
        .remove(files.map((f) => `${userId}/${f.name}`));
    }

    // 3) Auth-brugeren — cascade fjerner profiles.
    const { error: authError } = await service.auth.admin.deleteUser(userId);
    if (authError) throw new Error("delete_auth_user");

    console.info(`account action=delete user=${userId} outcome=ok`);
    return jsonResponse(req, 200, { data: { deleted: true } });
  } catch (err) {
    const code = err instanceof Error ? err.message : "internal";
    console.error(`account action=delete user=${userId} outcome=error code=${code}`);
    return error(req, 500, "delete_failed");
  }
});
