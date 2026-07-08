import { fillNutrientGaps, type NutrientMap } from "@madro/core";
import { supabase } from "../../lib/supabase";
import type { FoodHit } from "../../scanner/useLookup";
import { pickBestMatch, searchWithFallback } from "./mealDraft";

/**
 * Verificeret-opslag-kobling (2026-07-08, blåbær-testfundet): varer uden
 * (mikro)næringstal kan suppleres fra Frida/USDA, som allerede ligger i
 * foods-tabellen. Varens egne deklarationstal vinder altid — opslaget
 * fylder kun hullerne (fillNutrientGaps i @madro/core).
 */

/** Topkandidater fra verificerede kilder til et varenavn, bedste først. */
export async function findVerifiedMatches(
  name: string,
  limit = 3,
): Promise<FoodHit[]> {
  const { candidates, query } = await searchWithFallback(
    name,
    (f) => f.data_quality === "verified",
  );
  if (candidates.length === 0) return [];
  const best = pickBestMatch(query, candidates);
  const rest = best ? candidates.filter((f) => f.id !== best.id) : candidates;
  return (best ? [best, ...rest] : rest).slice(0, limit);
}

/**
 * Kopiér manglende næringstal fra et verificeret opslag ind i brugerens
 * egen vare. RLS tillader kun opdatering af egne custom-varer — null
 * retur betyder afvist (ikke din vare) eller væk.
 */
export async function adoptVerifiedNutriments(
  food: FoodHit,
  verified: FoodHit,
): Promise<FoodHit | null> {
  const merged = fillNutrientGaps(
    (food.nutriments ?? {}) as NutrientMap,
    (verified.nutriments ?? {}) as NutrientMap,
  ) as Record<string, number>;
  const { data, error } = await supabase
    .from("foods")
    .update({ nutriments: merged })
    .eq("id", food.id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data ? { ...food, nutriments: merged } : null;
}
