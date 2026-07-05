/**
 * Kanonisk nutrient-skema (fase-tjekliste 1.2): ét fælles nøglesæt for
 * alle kilder (OFF/USDA/Frida), så værdier kan lægges sammen i én
 * profil. Alle værdier er PR. 100 G spiselig vare i nøglens enhed.
 */

export const NUTRIENT_KEYS = [
  "energy_kcal",
  "protein_g",
  "carbohydrate_g",
  "sugars_g",
  "fat_g",
  "saturated_fat_g",
  "fiber_g",
  "salt_g",
  "sodium_mg",
  "vitamin_a_re_ug",
  "vitamin_c_mg",
  "vitamin_d_ug",
  "vitamin_e_mg",
  "thiamin_mg",
  "riboflavin_mg",
  "vitamin_b6_mg",
  "folate_ug",
  "vitamin_b12_ug",
  "calcium_mg",
  "iron_mg",
  "magnesium_mg",
  "potassium_mg",
  "zinc_mg",
  "selenium_ug",
  "iodine_ug",
  "phosphorus_mg",
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

export type NutrientMap = Partial<Record<NutrientKey, number>>;

export interface NutrientInfo {
  /** Enhed som værdien er udtrykt i. */
  unit: "kcal" | "g" | "mg" | "µg";
  labelDa: string;
  labelEn: string;
  /** Er dette et mikronæringsstof (kandidat til mikrostriben/dækning)? */
  micro: boolean;
}

export const NUTRIENT_INFO: Record<NutrientKey, NutrientInfo> = {
  energy_kcal: { unit: "kcal", labelDa: "Energi", labelEn: "Energy", micro: false },
  protein_g: { unit: "g", labelDa: "Protein", labelEn: "Protein", micro: false },
  carbohydrate_g: { unit: "g", labelDa: "Kulhydrat", labelEn: "Carbohydrate", micro: false },
  sugars_g: { unit: "g", labelDa: "Heraf sukkerarter", labelEn: "Of which sugars", micro: false },
  fat_g: { unit: "g", labelDa: "Fedt", labelEn: "Fat", micro: false },
  saturated_fat_g: { unit: "g", labelDa: "Heraf mættet fedt", labelEn: "Of which saturated", micro: false },
  fiber_g: { unit: "g", labelDa: "Kostfibre", labelEn: "Fibre", micro: false },
  salt_g: { unit: "g", labelDa: "Salt", labelEn: "Salt", micro: false },
  sodium_mg: { unit: "mg", labelDa: "Natrium", labelEn: "Sodium", micro: false },
  vitamin_a_re_ug: { unit: "µg", labelDa: "A-vitamin (RE)", labelEn: "Vitamin A (RE)", micro: true },
  vitamin_c_mg: { unit: "mg", labelDa: "C-vitamin", labelEn: "Vitamin C", micro: true },
  vitamin_d_ug: { unit: "µg", labelDa: "D-vitamin", labelEn: "Vitamin D", micro: true },
  vitamin_e_mg: { unit: "mg", labelDa: "E-vitamin", labelEn: "Vitamin E", micro: true },
  thiamin_mg: { unit: "mg", labelDa: "Thiamin (B1)", labelEn: "Thiamin (B1)", micro: true },
  riboflavin_mg: { unit: "mg", labelDa: "Riboflavin (B2)", labelEn: "Riboflavin (B2)", micro: true },
  vitamin_b6_mg: { unit: "mg", labelDa: "B6-vitamin", labelEn: "Vitamin B6", micro: true },
  folate_ug: { unit: "µg", labelDa: "Folat", labelEn: "Folate", micro: true },
  vitamin_b12_ug: { unit: "µg", labelDa: "B12-vitamin", labelEn: "Vitamin B12", micro: true },
  calcium_mg: { unit: "mg", labelDa: "Calcium", labelEn: "Calcium", micro: true },
  iron_mg: { unit: "mg", labelDa: "Jern", labelEn: "Iron", micro: true },
  magnesium_mg: { unit: "mg", labelDa: "Magnesium", labelEn: "Magnesium", micro: true },
  potassium_mg: { unit: "mg", labelDa: "Kalium", labelEn: "Potassium", micro: true },
  zinc_mg: { unit: "mg", labelDa: "Zink", labelEn: "Zinc", micro: true },
  selenium_ug: { unit: "µg", labelDa: "Selen", labelEn: "Selenium", micro: true },
  iodine_ug: { unit: "µg", labelDa: "Jod", labelEn: "Iodine", micro: true },
  phosphorus_mg: { unit: "mg", labelDa: "Fosfor", labelEn: "Phosphorus", micro: true },
};

export function isNutrientKey(key: string): key is NutrientKey {
  return (NUTRIENT_KEYS as readonly string[]).includes(key);
}
