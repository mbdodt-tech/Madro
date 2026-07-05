import { finalizeNutrients } from "./convert";
import type { NutrientKey, NutrientMap } from "./keys";

/**
 * OFF's nutriment-navne (fra parquet/JSONL, uden _100g-suffiks) →
 * kanoniske nøgler. OFF angiver værdier i g/mg/µg efter feltnavnet;
 * de her medtagne er alle i samme enhed som den kanoniske nøgle,
 * undtagen natrium (OFF: gram) og mineraler (OFF: gram) — se faktorer.
 */
const OFF_MAP: Record<string, { key: NutrientKey; factor: number }> = {
  "energy-kcal": { key: "energy_kcal", factor: 1 },
  proteins: { key: "protein_g", factor: 1 },
  carbohydrates: { key: "carbohydrate_g", factor: 1 },
  sugars: { key: "sugars_g", factor: 1 },
  fat: { key: "fat_g", factor: 1 },
  "saturated-fat": { key: "saturated_fat_g", factor: 1 },
  fiber: { key: "fiber_g", factor: 1 },
  salt: { key: "salt_g", factor: 1 },
  // OFF: sodium i gram → mg
  sodium: { key: "sodium_mg", factor: 1000 },
  // OFF: mineraler/vitaminer i gram → mg/µg
  "vitamin-a": { key: "vitamin_a_re_ug", factor: 1_000_000 },
  "vitamin-c": { key: "vitamin_c_mg", factor: 1000 },
  "vitamin-d": { key: "vitamin_d_ug", factor: 1_000_000 },
  "vitamin-e": { key: "vitamin_e_mg", factor: 1000 },
  "vitamin-b1": { key: "thiamin_mg", factor: 1000 },
  "vitamin-b2": { key: "riboflavin_mg", factor: 1000 },
  "vitamin-b6": { key: "vitamin_b6_mg", factor: 1000 },
  "vitamin-b9": { key: "folate_ug", factor: 1_000_000 },
  "vitamin-b12": { key: "vitamin_b12_ug", factor: 1_000_000 },
  calcium: { key: "calcium_mg", factor: 1000 },
  iron: { key: "iron_mg", factor: 1000 },
  magnesium: { key: "magnesium_mg", factor: 1000 },
  potassium: { key: "potassium_mg", factor: 1000 },
  zinc: { key: "zinc_mg", factor: 1000 },
  selenium: { key: "selenium_ug", factor: 1_000_000 },
  iodine: { key: "iodine_ug", factor: 1_000_000 },
  phosphorus: { key: "phosphorus_mg", factor: 1000 },
};

/** Navne som OFF-parquettens nutriments-liste bruger (feltet `name`). */
export const OFF_NUTRIMENT_NAMES = Object.keys(OFF_MAP);

/**
 * `entries`: OFF-nutriments som { name, per100g } — værdier i OFF's
 * grundenhed for feltet (gram for næsten alt).
 */
export function mapOffNutriments(
  entries: Array<{ name: string; per100g: number | null | undefined }>,
): NutrientMap {
  const out: NutrientMap = {};
  for (const entry of entries) {
    const mapping = OFF_MAP[entry.name];
    if (!mapping) continue;
    const v = entry.per100g;
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    out[mapping.key] = v * mapping.factor;
  }
  return finalizeNutrients(out);
}
