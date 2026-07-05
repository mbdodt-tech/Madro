/**
 * Dagsopsamlinger til "I dag"-skærmen (fase-tjekliste 1.6).
 * Alle beregninger her — aldrig inline i komponenter (CLAUDE.md).
 * 1.7 flytter persistering til daily_summaries; formlerne bor stadig her.
 */

import { scalePer100, roundNutrient } from "../nutrients/convert";
import type { NutrientKey, NutrientMap } from "../nutrients/keys";
import {
  coveragePct,
  dailyReference,
  type ReferenceProfile,
  type ReferenceRow,
} from "../nutrients/reference";

export interface RollupEntry {
  /** Næringsindhold pr. 100 g (kanoniske nøgler). */
  nutriments: NutrientMap | null | undefined;
  /** Portionsstørrelse i gram. */
  grams: number;
}

/** Summér dagens indtag på tværs af poster (pr. kanonisk nøgle). */
export function sumNutrients(entries: RollupEntry[]): NutrientMap {
  const totals: NutrientMap = {};
  for (const entry of entries) {
    if (!entry.nutriments || entry.grams <= 0) continue;
    for (const [key, per100] of Object.entries(entry.nutriments) as [
      NutrientKey,
      number,
    ][]) {
      if (typeof per100 !== "number" || !Number.isFinite(per100)) continue;
      totals[key] = (totals[key] ?? 0) + scalePer100(per100, entry.grams);
    }
  }
  for (const key of Object.keys(totals) as NutrientKey[]) {
    totals[key] = roundNutrient(totals[key]!);
  }
  return totals;
}

export interface NovaEntry {
  novaGroup: number | null | undefined;
  grams: number;
}

export interface NovaShare {
  /** Gram-vægtet andel NOVA 1-3 af det indtag, hvor NOVA kendes (0-100). */
  pct: number;
  knownGrams: number;
  totalGrams: number;
}

/**
 * Kvalitetsbuens tal: andel ikke-ultraforarbejdet (NOVA 1-3 vs. 4),
 * vægtet efter gram. Poster uden kendt NOVA indgår ikke i nævneren —
 * og kender vi intet, opfinder vi ikke en andel (null → ærlig tom bue).
 */
export function novaShare(entries: NovaEntry[]): NovaShare | null {
  let knownGrams = 0;
  let totalGrams = 0;
  let nonUltraGrams = 0;
  for (const entry of entries) {
    if (entry.grams <= 0) continue;
    totalGrams += entry.grams;
    const nova = entry.novaGroup;
    if (nova == null || nova < 1 || nova > 4) continue;
    knownGrams += entry.grams;
    if (nova <= 3) nonUltraGrams += entry.grams;
  }
  if (knownGrams === 0) return null;
  return {
    pct: Math.round((nonUltraGrams / knownGrams) * 100),
    knownGrams,
    totalGrams,
  };
}

export interface MacroTargets {
  kcal: number;
  protein_g: number;
  carbohydrate_g: number;
  fat_g: number;
}

/** Energiprocent-fordeling for standardmål: 20 % protein, 50 % kulhydrat, 30 % fedt. */
const ENERGY_SPLIT = { protein: 0.2, carbohydrate: 0.5, fat: 0.3 } as const;
const KCAL_PER_G = { protein: 4, carbohydrate: 4, fat: 9 } as const;

/** NNR-forenklede default-kcal (godkendt 2026-07-05): neutral reference, ingen vægttabslogik. */
const DEFAULT_KCAL: Record<string, number> = {
  female: 2000,
  male: 2500,
};
const DEFAULT_KCAL_UNKNOWN = 2100;

function targetsFromKcal(kcal: number): MacroTargets {
  return {
    kcal,
    protein_g: Math.round((kcal * ENERGY_SPLIT.protein) / KCAL_PER_G.protein),
    carbohydrate_g: Math.round(
      (kcal * ENERGY_SPLIT.carbohydrate) / KCAL_PER_G.carbohydrate,
    ),
    fat_g: Math.round((kcal * ENERGY_SPLIT.fat) / KCAL_PER_G.fat),
  };
}

/**
 * Profilens goals-jsonb vinder felt for felt (delvise mål tilladt —
 * fx kun kcal sat: makro-gram afledes af den); ellers NNR-forenklet
 * default efter køn.
 */
export function resolveTargets(
  goals: Record<string, unknown> | null | undefined,
  profile: { sex?: string | null },
): MacroTargets {
  const goalNumber = (key: string): number | null => {
    const v = goals?.[key];
    return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
  };
  const kcal =
    goalNumber("kcal") ??
    DEFAULT_KCAL[profile.sex ?? ""] ??
    DEFAULT_KCAL_UNKNOWN;
  const base = targetsFromKcal(kcal);
  return {
    kcal,
    protein_g: goalNumber("protein_g") ?? base.protein_g,
    carbohydrate_g: goalNumber("carbohydrate_g") ?? base.carbohydrate_g,
    fat_g: goalNumber("fat_g") ?? base.fat_g,
  };
}

/** De 8 fremhævede mikronæringsstoffer i striben (godkendt 2026-07-05, se open-questions). */
export const MICRO_STRIP_KEYS: NutrientKey[] = [
  "vitamin_d_ug",
  "iron_mg",
  "magnesium_mg",
  "calcium_mg",
  "potassium_mg",
  "vitamin_b12_ug",
  "folate_ug",
  "zinc_mg",
];

export interface MicroCoverage {
  key: NutrientKey;
  /** Dækning i % af dagens reference; null når reference mangler. */
  pct: number | null;
  intake: number;
  rda: number | null;
  unit: string | null;
}

/**
 * Dækningsgrad pr. mikronæringsstof mod nutrient_references.
 * Returnerer i den givne nøglerækkefølge; sortering (laveste først)
 * er visningens ansvar.
 */
export function micronutrientCoverage(
  totals: NutrientMap,
  rows: ReferenceRow[],
  profile: ReferenceProfile,
  keys: NutrientKey[],
): MicroCoverage[] {
  return keys.map((key) => {
    const reference = dailyReference(rows, key, profile);
    const intake = totals[key] ?? 0;
    return {
      key,
      pct:
        reference && reference.rda
          ? Math.round(coveragePct(intake, reference) ?? 0)
          : null,
      intake,
      rda: reference?.rda ?? null,
      unit: reference?.unit ?? null,
    };
  });
}
