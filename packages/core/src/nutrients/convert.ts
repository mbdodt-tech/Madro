import type { NutrientMap } from "./keys";

export const KJ_PER_KCAL = 4.184;

export function kjToKcal(kj: number): number {
  return kj / KJ_PER_KCAL;
}

export function mgToUg(mg: number): number {
  return mg * 1000;
}

export function ugToMg(ug: number): number {
  return ug / 1000;
}

export function gToMg(g: number): number {
  return g * 1000;
}

/** Konventionen fra fødevaremærkning: salt = natrium × 2,5. */
export function sodiumMgToSaltG(sodiumMg: number): number {
  return (sodiumMg * 2.5) / 1000;
}

/**
 * Skalér en pr.-100 g-værdi til en portion. Bruges af alle portions-
 * visninger (scan-flowets kcal-preview, dagbogsrækker) — aldrig inline
 * i komponenter, jf. CLAUDE.md.
 */
export function scalePer100(valuePer100: number, grams: number): number {
  return (valuePer100 * grams) / 100;
}

/** Afrund til 3 betydende decimaler — nok til alle nutrient-visninger. */
export function roundNutrient(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Efterbehandling af en kanonisk map: udled salt af natrium (og omvendt),
 * drop ikke-finitte værdier og afrund.
 */
export function finalizeNutrients(map: NutrientMap): NutrientMap {
  const out: NutrientMap = {};
  for (const [key, value] of Object.entries(map) as [keyof NutrientMap, number][]) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      out[key] = roundNutrient(value);
    }
  }
  if (out.salt_g == null && out.sodium_mg != null) {
    out.salt_g = roundNutrient(sodiumMgToSaltG(out.sodium_mg));
  }
  if (out.sodium_mg == null && out.salt_g != null) {
    out.sodium_mg = roundNutrient((out.salt_g * 1000) / 2.5);
  }
  return out;
}
