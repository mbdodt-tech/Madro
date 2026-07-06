import {
  buildWeeklyStats,
  computeVerdict,
  NUTRIENT_INFO,
  type DaySummaryInput,
  type NutrientKey,
  type NutrientMap,
  type ReferenceRow,
} from "@madro/core";
import { aiClient } from "../../lib/aiClient";
import { supabase } from "../../lib/supabase";
import type { FoodHit } from "../../scanner/useLookup";
import { addDays, dayKey } from "../diary/useDiary";
import { mondayOf } from "../insights/useInsights";

const FOOD_COLUMNS =
  "id,name,brand,source,data_quality,nova_group,nutriscore,nutriments,image_url,additives,categories";

export interface Alternative {
  food: FoodHit;
  score: number;
  reason: string;
}

function scoreOf(food: FoodHit): number | null {
  const result = computeVerdict({
    nutriscore: food.nutriscore,
    novaGroup: food.nova_group,
    additivesCount: food.additives ? (food.additives as string[]).length : null,
  });
  return result.insufficient ? null : result.score;
}

/**
 * Kandidater i samme kategori med HØJERE verdikt-score end varen —
 * filteret garanterer acceptkravet "af bedre kvalitet". Top 8 efter score.
 */
async function fetchCandidates(
  food: FoodHit,
  productScore: number,
): Promise<{ food: FoodHit; score: number }[]> {
  const categories = (food.categories as string[] | null) ?? [];
  if (categories.length === 0) return [];
  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_COLUMNS)
    .overlaps("categories", categories)
    .neq("id", food.id)
    .not("nutriments", "eq", "{}")
    .limit(40);
  if (error) throw error;
  return ((data ?? []) as FoodHit[])
    .map((candidate) => ({ food: candidate, score: scoreOf(candidate) }))
    .filter((c): c is { food: FoodHit; score: number } => c.score != null)
    .filter((c) => c.score > productScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

/** Ugens 3 laveste mikro-dækninger (samme grundlag som Indsigt). */
async function getWeeklyGaps(profile: {
  sex?: string | null;
  birth_year?: number | null;
  rda_region?: string | null;
}): Promise<{ name: string; pct: number; key: NutrientKey }[]> {
  const weekStart = mondayOf(new Date());
  const [{ data: summaries }, { data: rows }] = await Promise.all([
    supabase
      .from("daily_summaries")
      .select("*")
      .gte("day", dayKey(weekStart))
      .lte("day", dayKey(addDays(weekStart, 6))),
    supabase
      .from("nutrient_references")
      .select("nutrient_key,region,sex,age_min,age_max,rda,ul,unit")
      .eq("region", profile.rda_region ?? "DK"),
  ]);
  const days: DaySummaryInput[] = (summaries ?? []).map((s) => ({
    day: s.day,
    kcal: s.kcal != null ? Number(s.kcal) : null,
    macros: (s.macros ?? {}) as NutrientMap,
    micros: (s.micros ?? {}) as NutrientMap,
    novaShare: s.nova_share != null ? Number(s.nova_share) : null,
  }));
  const stats = buildWeeklyStats(days, (rows ?? []) as ReferenceRow[], {
    sex: profile.sex === "male" ? "male" : "female",
    age: profile.birth_year ? new Date().getFullYear() - profile.birth_year : 35,
    region: profile.rda_region ?? "DK",
  });
  return stats.lowestMicros.map((m) => ({
    name: m.name.da,
    pct: m.pct,
    key: m.key as NutrientKey,
  }));
}

interface StoredItem {
  food_id: string;
  reason: string;
}

/**
 * Hent (eller generér og persistér) anbefalinger for en scanning.
 * Genåbning af samme scan rammer recommendations-cachen — intet nyt AI-kald.
 * Returnerer tom liste når intet i kategorien slår varens score (ærlig besked).
 */
export async function getOrCreateAlternatives(
  scanId: string | null,
  food: FoodHit,
  locale: "da" | "en",
  profile: {
    sex?: string | null;
    birth_year?: number | null;
    rda_region?: string | null;
  },
): Promise<Alternative[]> {
  const productScore = scoreOf(food) ?? 0;

  // 1) Cache pr. scan
  if (scanId) {
    const { data: existing } = await supabase
      .from("recommendations")
      .select("items")
      .eq("scan_id", scanId)
      .maybeSingle();
    if (existing) {
      const items = (existing.items ?? []) as unknown as StoredItem[];
      return hydrate(items);
    }
  }

  // 2) Kandidater (allerede filtreret til bedre score)
  const candidates = await fetchCandidates(food, productScore);
  if (candidates.length === 0) return [];
  if (candidates.length === 1) {
    // Én oplagt kandidat behøver ingen AI-rangering.
    const single = [{ food_id: candidates[0]!.food.id, reason: "" }];
    await persist(scanId, single);
    return [{ food: candidates[0]!.food, score: candidates[0]!.score, reason: "" }];
  }

  // 3) AI-rangering vægtet efter ugens mangler
  const gaps = await getWeeklyGaps(profile);
  const result = await aiClient.callAi("rank_alternatives", {
    locale,
    product: { name: food.name, score: productScore },
    weeklyGaps: gaps.map(({ name, pct }) => ({ name, pct })),
    candidates: candidates.map((c) => ({
      id: c.food.id,
      name: c.food.name,
      ...(c.food.brand ? { brand: c.food.brand } : {}),
      score: c.score,
      ...(c.food.nova_group != null ? { novaGroup: c.food.nova_group } : {}),
      ...(c.food.nutriscore ? { nutriscore: c.food.nutriscore } : {}),
      gapNutrients: Object.fromEntries(
        gaps
          .map((g) => [
            NUTRIENT_INFO[g.key].labelDa,
            (c.food.nutriments as NutrientMap)[g.key],
          ])
          .filter(([, v]) => typeof v === "number"),
      ),
    })),
  });

  const byId = new Map(candidates.map((c) => [c.food.id, c]));
  const items: StoredItem[] = result.picks
    .filter((p) => byId.has(p.id))
    .map((p) => ({ food_id: p.id, reason: p.reason }));

  await persist(scanId, items);
  return items.map((item) => {
    const c = byId.get(item.food_id)!;
    return { food: c.food, score: c.score, reason: item.reason };
  });

  async function hydrate(items: StoredItem[]): Promise<Alternative[]> {
    if (items.length === 0) return [];
    const { data } = await supabase
      .from("foods")
      .select(FOOD_COLUMNS)
      .in("id", items.map((i) => i.food_id));
    const foods = new Map(((data ?? []) as FoodHit[]).map((f) => [f.id, f]));
    return items
      .filter((i) => foods.has(i.food_id))
      .map((i) => {
        const f = foods.get(i.food_id)!;
        return { food: f, score: scoreOf(f) ?? 0, reason: i.reason };
      });
  }

  async function persist(scan: string | null, items: StoredItem[]): Promise<void> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return;
    await supabase.from("recommendations").insert({
      user_id: userId,
      scan_id: scan,
      day: dayKey(new Date()),
      items: JSON.parse(JSON.stringify(items)),
    });
  }
}
