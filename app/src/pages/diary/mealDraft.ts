import type { ParsedMealItem, PortionUnitId } from "@madro/core";
import { searchFoodsRanked, type FoodHit } from "../../scanner/useLookup";

export interface DraftRow {
  key: number;
  name: string;
  note?: string;
  grams: number;
  gramsText: string;
  /** Husholdningsmål (3.3): "g" = gram-felt; ellers antal × enhed → gram. */
  unit: PortionUnitId;
  countText: string;
  match: FoodHit | null;
  /** Række-lokal søgning når brugeren vil skifte match. */
  searching: boolean;
  candidates: FoodHit[];
}

export function clampGrams(value: number): number {
  return Math.min(2000, Math.max(1, Math.round(value)));
}

/**
 * Vælg bedste kandidat til et parset navn. ilike-søgningen matcher
 * substrings midt i ord ("ost" → "T-ost-ada shells"), så rangér:
 * eksakt navn > prefiks+skilletegn ("Ost, fast…") > prefiks > helt ord
 * > øvrige (søgeordenen bevares som tie-breaker: verified før crowdsourced).
 */
export function pickBestMatch(name: string, candidates: FoodHit[]): FoodHit | null {
  const q = name.trim().toLowerCase();
  const wordRe = new RegExp(
    `(^|[^\\p{L}])${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`,
    "iu",
  );
  const score = (food: FoodHit): number => {
    const n = food.name.toLowerCase();
    if (n === q) return 0;
    if (n.startsWith(q) && !/\p{L}/u.test(n.charAt(q.length))) return 1;
    if (n.startsWith(q)) return 2;
    if (wordRe.test(food.name)) return 3;
    return 4;
  };
  return [...candidates]
    .map((food, index) => ({ food, index, s: score(food) }))
    .sort((a, b) => a.s - b.s || a.index - b.index)[0]?.food ?? null;
}

let rowKeyCounter = 0;

/**
 * Søg med token-fallback: sammensatte navne fra foto-genkendelsen
 * ("kogt spaghetti", "revet parmesan") findes sjældent ordret — falder
 * tilbage på det længste ord (≥4 tegn), så "spaghetti"/"parmesan" rammer.
 * `accept` filtreres FØR fallback-beslutningen: uden det ville fx en
 * custom-vare, der matcher sit eget navn, blokere fallbacken, selv om
 * kalderen kun leder efter verificerede opslag.
 */
export async function searchWithFallback(
  name: string,
  accept: (food: FoodHit) => boolean = () => true,
): Promise<{ candidates: FoodHit[]; query: string }> {
  try {
    const direct = (await searchFoodsRanked(name)).filter(accept);
    if (direct.length > 0) return { candidates: direct, query: name };
  } catch {
    return { candidates: [], query: name };
  }
  const tokens = [
    ...new Set(
      name
        .toLowerCase()
        .split(/[^\p{L}]+/u)
        .filter((t) => t.length >= 4),
    ),
  ].sort((a, b) => b.length - a.length);
  for (const token of tokens) {
    try {
      const hits = (await searchFoodsRanked(token)).filter(accept);
      if (hits.length > 0) return { candidates: hits, query: token };
    } catch {
      break;
    }
  }
  return { candidates: [], query: name };
}

/** Byg redigerbare rækker af parsede poster: match hver mod foods. */
export async function buildRows(items: ParsedMealItem[]): Promise<DraftRow[]> {
  return Promise.all(
    items.map(async (item) => {
      const { candidates, query } = await searchWithFallback(item.name);
      return {
        key: rowKeyCounter++,
        name: item.name,
        note: item.note,
        grams: clampGrams(item.grams),
        gramsText: String(clampGrams(item.grams)),
        unit: "g",
        countText: "1",
        match: pickBestMatch(query, candidates),
        searching: false,
        candidates,
      } satisfies DraftRow;
    }),
  );
}
