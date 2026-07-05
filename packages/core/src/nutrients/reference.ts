import type { NutrientKey } from "./keys";

/**
 * Opslag i nutrient_references-rækker for en profil.
 * Rækkerne kommer fra DB (region/sex/age_min/age_max/rda/ul).
 */

export interface ReferenceRow {
  nutrient_key: string;
  region: string;
  sex: string; // 'male' | 'female' | 'any'
  age_min: number;
  age_max: number;
  rda: number | null;
  ul: number | null;
  unit: string;
}

export interface ReferenceProfile {
  sex: "male" | "female";
  age: number;
  region: string; // 'DK' | 'EU' | 'US'
}

/**
 * Find den bedst matchende række for et næringsstof og en profil:
 * eksakt køn foretrækkes over 'any'; alder skal ligge i intervallet.
 */
export function dailyReference(
  rows: ReferenceRow[],
  nutrientKey: NutrientKey,
  profile: ReferenceProfile,
): ReferenceRow | null {
  const candidates = rows.filter(
    (r) =>
      r.nutrient_key === nutrientKey &&
      r.region === profile.region &&
      profile.age >= r.age_min &&
      profile.age <= r.age_max &&
      (r.sex === profile.sex || r.sex === "any"),
  );
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => {
    // Eksakt køn før 'any'; derefter snævrest aldersinterval
    const sexScore = (r: ReferenceRow) => (r.sex === profile.sex ? 0 : 1);
    const span = (r: ReferenceRow) => r.age_max - r.age_min;
    return sexScore(a) - sexScore(b) || span(a) - span(b);
  })[0]!;
}

/** Dækningsgrad i procent (0-100+, ikke cappet). */
export function coveragePct(intake: number, reference: ReferenceRow): number | null {
  if (reference.rda == null || reference.rda <= 0) return null;
  return (intake / reference.rda) * 100;
}
