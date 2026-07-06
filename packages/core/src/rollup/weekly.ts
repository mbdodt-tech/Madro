/**
 * Uge-opsamling til Indsigt-fanen (fase 2.4). Læser præberegnede
 * daily_summaries (1.7) — aggregerer aldrig rå log_entries.
 */

import { NUTRIENT_INFO, type NutrientKey, type NutrientMap } from "../nutrients/keys";
import type { ReferenceProfile, ReferenceRow } from "../nutrients/reference";
import { micronutrientCoverage, MICRO_STRIP_KEYS } from "./rollup";

/** Delmængden af en daily_summaries-række som ugen bygger på. */
export interface DaySummaryInput {
  /** ISO-dato (YYYY-MM-DD). */
  day: string;
  kcal: number | null;
  macros: NutrientMap;
  micros: NutrientMap;
  novaShare: number | null;
}

export interface WeeklyTrendPoint {
  day: string;
  kcal: number | null;
  novaShare: number | null;
}

export interface WeeklyStats {
  daysLogged: number;
  avgKcal: number | null;
  avgNovaShare: number | null;
  avgProteinG: number | null;
  trend: WeeklyTrendPoint[];
  /** De 3 laveste gennemsnitlige mikro-dækninger (kun dage m. data). */
  lowestMicros: { key: string; name: { da: string; en: string }; pct: number }[];
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Byg ugens statistik for de givne dage (typisk 7). Dage uden summary
 * skal medsendes med null-værdier, så trenden har huller — de tæller
 * ikke i gennemsnittene.
 */
export function buildWeeklyStats(
  days: DaySummaryInput[],
  referenceRows: ReferenceRow[],
  profile: ReferenceProfile,
): WeeklyStats {
  const logged = days.filter((d) => d.kcal != null || Object.keys(d.macros).length > 0);

  const avgKcal = mean(logged.map((d) => d.kcal).filter((v): v is number => v != null));
  const avgNovaShare = mean(
    logged.map((d) => d.novaShare).filter((v): v is number => v != null),
  );
  const avgProteinG = mean(
    logged
      .map((d) => d.macros.protein_g)
      .filter((v): v is number => typeof v === "number"),
  );

  // Mikro-dækning: dagens micros → dækning pr. nøgle → middel over dage.
  const perKey = new Map<NutrientKey, number[]>();
  for (const day of logged) {
    const coverage = micronutrientCoverage(
      day.micros,
      referenceRows,
      profile,
      MICRO_STRIP_KEYS,
    );
    for (const c of coverage) {
      if (c.pct == null) continue;
      const list = perKey.get(c.key) ?? [];
      list.push(c.pct);
      perKey.set(c.key, list);
    }
  }
  const lowestMicros = [...perKey.entries()]
    .map(([key, pcts]) => ({
      key: key as string,
      name: { da: NUTRIENT_INFO[key].labelDa, en: NUTRIENT_INFO[key].labelEn },
      pct: Math.round(mean(pcts) ?? 0),
    }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  return {
    daysLogged: logged.length,
    avgKcal: avgKcal != null ? Math.round(avgKcal) : null,
    avgNovaShare: avgNovaShare != null ? Math.round(avgNovaShare) : null,
    avgProteinG: avgProteinG != null ? Math.round(avgProteinG) : null,
    trend: days.map((d) => ({ day: d.day, kcal: d.kcal, novaShare: d.novaShare })),
    lowestMicros,
  };
}
