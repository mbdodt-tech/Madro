import { supabase } from "../../lib/supabase";

/**
 * GDPR-rettighederne (fase 4.2).
 * Eksporten er den GRATIS indsigtsret (alle egne rækker via RLS → én
 * JSON-fil, ingen server-tur) — ikke premium-"rapporteksport"-featuren.
 * Sletning går gennem account-funktionen (service role kræves).
 */

const OWN_TABLES = [
  "scans",
  "daily_summaries",
  "body_metrics",
  "activity_days",
  "insights",
  "recommendations",
] as const;

export async function downloadMyData(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return;

  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    format: "madro-export-v1",
  };

  const { data: profile } = await supabase.from("profiles").select("*").maybeSingle();
  out.profile = profile;

  // Dagbogen beriges med fødevarenavne, så filen kan læses af et menneske.
  const { data: entries } = await supabase
    .from("log_entries")
    .select("*, foods(name, brand, source)");
  out.log_entries = entries ?? [];

  for (const table of OWN_TABLES) {
    const { data } = await supabase.from(table).select("*");
    out[table] = data ?? [];
  }

  const { data: customFoods } = await supabase
    .from("foods")
    .select("*")
    .eq("source", "custom")
    .eq("owner_id", userId);
  out.custom_foods = customFoods ?? [];

  const blob = new Blob([JSON.stringify(out, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `madro-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Sletter kontoen permanent via account-funktionen; kaster ved fejl. */
export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("account", {
    body: { action: "delete" },
  });
  if (error || !(data as { data?: { deleted?: boolean } })?.data?.deleted) {
    throw new Error("delete_failed");
  }
  await supabase.auth.signOut();
}
