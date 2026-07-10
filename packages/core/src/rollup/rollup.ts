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

/**
 * Kostprofiler (2026-07-10, brugerønske): ændrer KUN energifordelingen
 * mellem makroerne — kalorie-målet er uafhængigt. Kulhydrat er altid
 * restenergien, så makro-kcal summer til målet. Splits efter gængse
 * definitioner (keto ~5 E% kulhydrat). En kostprofil er et VALG, ikke
 * en anbefaling (ansvarlighedsregler: ingen individuelle kostråd).
 */
export const MACRO_PROFILES = {
  /** 20 % protein · 50 % kulhydrat · 30 % fedt (NNR-standard). */
  standard: { protein: 0.2, fat: 0.3 },
  /** 30 % protein · 40 % kulhydrat · 30 % fedt. */
  high_protein: { protein: 0.3, fat: 0.3 },
  /** 30 % protein · 25 % kulhydrat · 45 % fedt. */
  low_carb: { protein: 0.3, fat: 0.45 },
  /** 25 % protein · ~5 % kulhydrat · 70 % fedt. */
  keto: { protein: 0.25, fat: 0.7 },
} as const;

export type MacroProfileId = keyof typeof MACRO_PROFILES;

const KCAL_PER_G = { protein: 4, carbohydrate: 4, fat: 9 } as const;

/** NNR-forenklede default-kcal (godkendt 2026-07-05): neutral reference, ingen vægttabslogik. */
const DEFAULT_KCAL: Record<string, number> = {
  female: 2000,
  male: 2500,
};
const DEFAULT_KCAL_UNKNOWN = 2100;

/**
 * Aktivitetsfaktorer (PAL) efter NNR2023's grupper, forenklet til tre
 * niveauer (kap. "Energy"): stillesiddende ~1,4 · moderat aktiv ~1,6 ·
 * meget aktiv ~1,8. Ukendt niveau regnes som moderat — midterste antagelse,
 * ikke et skøn i nogen bestemt retning. (NNR2023-review er stadig åbent
 * brugerpunkt; faktorerne er samlet her, så de er lette at justere.)
 */
const ACTIVITY_FACTOR: Record<string, number> = {
  sedentary: 1.4,
  moderate: 1.6,
  active: 1.8,
};
const ACTIVITY_FACTOR_DEFAULT = 1.6;

/**
 * Målretning (fase 3.1): kun blide justeringer — ±300 kcal, aldrig
 * aggressive underskud (ansvarlighedsregel: ingen "tab hurtigt"-mekanik).
 */
const DIRECTION_DELTA: Record<string, number> = {
  maintain: 0,
  gentle_deficit: -300,
  gentle_surplus: 300,
};

/**
 * Konservativ bund for beregnede kcal-mål (K/M/ukendt): et mål under
 * dette niveau viser vi ikke, uanset profil og retning.
 */
const KCAL_FLOOR: Record<string, number> = {
  female: 1500,
  male: 1700,
};
const KCAL_FLOOR_UNKNOWN = 1500;

export interface TargetsProfile {
  sex?: string | null;
  /** Fødselsår — alder beregnes mod referenceYear (injicérbar i tests). */
  birthYear?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  /** sedentary | moderate | active (profiles.activity_level). */
  activityLevel?: string | null;
  /** Default: indeværende år. */
  referenceYear?: number;
}

/**
 * Mifflin-St Jeor (1990) hvile-stofskifte i kcal/dag:
 *   10·kg + 6,25·cm − 5·alder + (mand +5 / kvinde −161).
 * Ukendt køn → midtpunkt af de to konstanter (−78) frem for at gætte køn.
 * Kræver vægt, højde og fødselsår; ellers null (→ NNR-forenklet default).
 */
function mifflinBmr(profile: TargetsProfile): number | null {
  const { weightKg, heightCm, birthYear } = profile;
  if (weightKg == null || heightCm == null || birthYear == null) return null;
  if (!(weightKg > 0) || !(heightCm > 0)) return null;
  const year = profile.referenceYear ?? new Date().getFullYear();
  const age = year - birthYear;
  if (age < 1 || age > 120) return null;
  const sexConstant =
    profile.sex === "male" ? 5 : profile.sex === "female" ? -161 : -78;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant;
}

function kcalFloor(sex: string | null | undefined): number {
  return KCAL_FLOOR[sex ?? ""] ?? KCAL_FLOOR_UNKNOWN;
}

function targetsFromKcal(
  kcal: number,
  weightKg?: number | null,
  split: { protein: number; fat: number } = MACRO_PROFILES.standard,
): MacroTargets {
  // Protein: mindst 1,2 g/kg (NNR-interval for voksne) når vægten kendes,
  // dog aldrig under E%-afledningen; fedt efter kostprofilen; kulhydrat =
  // restenergien, så makro-kcal altid summer til målet.
  const proteinByEnergy = (kcal * split.protein) / KCAL_PER_G.protein;
  const proteinByWeight = weightKg != null && weightKg > 0 ? 1.2 * weightKg : 0;
  const proteinRaw = Math.max(proteinByEnergy, proteinByWeight);
  const fatRaw = (kcal * split.fat) / KCAL_PER_G.fat;
  // Resten regnes på de urundede energier, så standardstien (uden vægt)
  // giver præcis den gamle 20/50/30-fordeling.
  const carbohydrate_g = Math.round(
    Math.max(0, kcal - proteinRaw * KCAL_PER_G.protein - fatRaw * KCAL_PER_G.fat) /
      KCAL_PER_G.carbohydrate,
  );
  return {
    kcal,
    protein_g: Math.round(proteinRaw),
    carbohydrate_g,
    fat_g: Math.round(fatRaw),
  };
}

/**
 * Profilens goals-jsonb vinder felt for felt (delvise mål tilladt — fx kun
 * kcal sat: makro-gram afledes af den). Ellers, fase 3.1: fuld kropsprofil →
 * Mifflin-St Jeor × aktivitetsfaktor ± blid målretning, afrundet til nærmeste
 * 10 kcal og aldrig under den konservative bund. Ufuldstændig profil →
 * NNR-forenklet default efter køn (uændret siden 1.6).
 */
export function resolveTargets(
  goals: Record<string, unknown> | null | undefined,
  profile: TargetsProfile,
): MacroTargets {
  const goalNumber = (key: string): number | null => {
    const v = goals?.[key];
    return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
  };

  let kcal = goalNumber("kcal");
  if (kcal == null) {
    const bmr = mifflinBmr(profile);
    if (bmr != null) {
      const factor =
        ACTIVITY_FACTOR[profile.activityLevel ?? ""] ?? ACTIVITY_FACTOR_DEFAULT;
      const direction =
        typeof goals?.direction === "string" ? goals.direction : "maintain";
      const delta = DIRECTION_DELTA[direction] ?? 0;
      kcal = Math.max(
        kcalFloor(profile.sex),
        Math.round((bmr * factor + delta) / 10) * 10,
      );
    } else {
      kcal = DEFAULT_KCAL[profile.sex ?? ""] ?? DEFAULT_KCAL_UNKNOWN;
    }
  }

  // Kostprofilen styrer fordelingen; ukendt/manglende id → standard.
  const profileId =
    typeof goals?.macro_profile === "string" &&
    goals.macro_profile in MACRO_PROFILES
      ? (goals.macro_profile as MacroProfileId)
      : "standard";

  const base = targetsFromKcal(kcal, profile.weightKg, MACRO_PROFILES[profileId]);
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
