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
 * Slå en stregkode op i egen foods-tabel (cache-først, jf. CLAUDE.md)
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

/**
 * Éngangs-fallback ved cache-miss (jf. CLAUDE.md-datareglen): Edge
 * Functionen off-lookup henter varen server-side fra OFF's API, cacher
 * den i foods og returnerer rækken. Null = findes heller ikke hos OFF
 * (eller OFF er nede) → ægte miss-tilstand.
 */
export async function lookupViaOff(barcode: string): Promise<FoodHit | null> {
  const { data, error } = await supabase.functions.invoke<{ data: FoodHit }>(
    "off-lookup",
    { body: { barcode } },
  );
  if (error || !data?.data) return null;
  return data.data;
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

/**
 * Rangeret søgning til NL-matchning (fase 2.1). Substring-søgning alene
 * rammer midt i ord ("ost" → "T-ost-ada"), og prefiks alene drukner i
 * andre ord ("ost" → "Ostrich…"). Derfor flere lag, bedste først:
 * eksakt navn → "q,"/"q " (Fridas navnekonvention: "Ost, fast, 40+")
 * → prefiks → substring. Dubletter fjernes, lagorden bevares.
 */
export async function searchFoodsRanked(query: string): Promise<FoodHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const tier = async (pattern: string, limit: number): Promise<FoodHit[]> => {
    const { data, error } = await supabase
      .from("foods")
      .select(FOOD_COLUMNS)
      .ilike("name", pattern)
      .order("data_quality", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as FoodHit[];
  };

  const [exact, comma, space, prefix, substring] = await Promise.all([
    tier(q, 2),
    tier(`${q},%`, 4),
    tier(`${q} %`, 4),
    tier(`${q}%`, 5),
    searchFoods(q),
  ]);

  const seen = new Set<string>();
  const merged: FoodHit[] = [];
  for (const food of [...exact, ...comma, ...space, ...prefix, ...substring]) {
    if (!seen.has(food.id)) {
      seen.add(food.id);
      merged.push(food);
    }
  }
  return merged;
}
