import type { Tables } from "@madro/core";
import { supabase } from "../lib/supabase";

export type FoodHit = Pick<
  Tables<"foods">,
  | "id"
  | "name"
  | "brand"
  | "source"
  | "data_quality"
  | "nova_group"
  | "nutriscore"
  | "nutriments"
  | "image_url"
  | "additives"
>;

const FOOD_COLUMNS =
  "id,name,brand,source,data_quality,nova_group,nutriscore,nutriments,image_url,additives";

const QUALITY_PRIORITY: Record<string, number> = {
  verified: 0,
  crowdsourced: 1,
  user: 2,
};

/**
 * Slå en stregkode op i egen foods-tabel (aldrig live-OFF, jf. CLAUDE.md)
 * og registrér hændelsen i scans med outcome='checked'.
 * Verified-kilder foretrækkes over crowdsourced over brugeroprettede.
 */
export async function lookupBarcode(barcode: string): Promise<FoodHit | null> {
  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_COLUMNS)
    .eq("barcode", barcode)
    .limit(5);
  if (error) throw error;
  const hits = (data ?? []) as FoodHit[];
  hits.sort(
    (a, b) =>
      (QUALITY_PRIORITY[a.data_quality] ?? 9) - (QUALITY_PRIORITY[b.data_quality] ?? 9),
  );
  return hits[0] ?? null;
}

/** Registrér scanningen; returnerer scan-id'et til senere 'logged'-opdatering. */
export async function recordScan(
  barcode: string,
  foodId: string | null,
): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return null;
  const { data: row } = await supabase
    .from("scans")
    .insert({
      user_id: userId,
      type: "barcode",
      barcode,
      food_id: foodId,
      outcome: "checked",
    })
    .select("id")
    .single();
  return row?.id ?? null;
}

/** Minimal navnesøgning til miss-tilstanden (fuld søgeside kommer i 1.5). */
export async function searchFoods(query: string): Promise<FoodHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_COLUMNS)
    .ilike("name", `%${q}%`)
    .order("data_quality", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []) as FoodHit[];
}
