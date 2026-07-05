import { finalizeNutrients } from "./convert";
import type { NutrientKey, NutrientMap } from "./keys";

/**
 * Frida (DTU) → kanoniske nøgler. Frida-eksporten har én kolonne pr.
 * parameter med både dansk navn og EuroFIR-komponentkode. Vi matcher på
 * EuroFIR-koden (stabil) med dansk navn som fallback. Værdier er pr. 100 g.
 */
const FRIDA_EUROFIR: Record<string, { key: NutrientKey; factor: number }> = {
  ENERC: { key: "energy_kcal", factor: 1 }, // kcal-kolonnen vælges i parseren
  PROT: { key: "protein_g", factor: 1 },
  CHOAVL: { key: "carbohydrate_g", factor: 1 },
  SUGAR: { key: "sugars_g", factor: 1 },
  FAT: { key: "fat_g", factor: 1 },
  FASAT: { key: "saturated_fat_g", factor: 1 },
  FIBT: { key: "fiber_g", factor: 1 },
  NACL: { key: "salt_g", factor: 1 },
  NA: { key: "sodium_mg", factor: 1 },
  VITA: { key: "vitamin_a_re_ug", factor: 1 },
  VITC: { key: "vitamin_c_mg", factor: 1 },
  VITD: { key: "vitamin_d_ug", factor: 1 },
  VITE: { key: "vitamin_e_mg", factor: 1 },
  THIA: { key: "thiamin_mg", factor: 1 },
  RIBF: { key: "riboflavin_mg", factor: 1 },
  VITB6: { key: "vitamin_b6_mg", factor: 1 },
  FOL: { key: "folate_ug", factor: 1 },
  VITB12: { key: "vitamin_b12_ug", factor: 1 },
  CA: { key: "calcium_mg", factor: 1 },
  FE: { key: "iron_mg", factor: 1 },
  MG: { key: "magnesium_mg", factor: 1 },
  K: { key: "potassium_mg", factor: 1 },
  ZN: { key: "zinc_mg", factor: 1 },
  SE: { key: "selenium_ug", factor: 1 },
  ID: { key: "iodine_ug", factor: 1 },
  P: { key: "phosphorus_mg", factor: 1 },
};

/** Danske navne som fallback, hvis EuroFIR-koden mangler i eksporten. */
const FRIDA_DA: Record<string, NutrientKey> = {
  "energi, kcal": "energy_kcal",
  protein: "protein_g",
  "kulhydrat, tilgængelig": "carbohydrate_g",
  sukkerarter: "sugars_g",
  fedt: "fat_g",
  "fedtsyrer, mættede": "saturated_fat_g",
  kostfibre: "fiber_g",
  salt: "salt_g",
  natrium: "sodium_mg",
  "a-vitamin": "vitamin_a_re_ug",
  "c-vitamin": "vitamin_c_mg",
  "d-vitamin": "vitamin_d_ug",
  "e-vitamin": "vitamin_e_mg",
  thiamin: "thiamin_mg",
  riboflavin: "riboflavin_mg",
  "b6-vitamin": "vitamin_b6_mg",
  folat: "folate_ug",
  "b12-vitamin": "vitamin_b12_ug",
  calcium: "calcium_mg",
  jern: "iron_mg",
  magnesium: "magnesium_mg",
  kalium: "potassium_mg",
  zink: "zinc_mg",
  selen: "selenium_ug",
  jod: "iodine_ug",
  fosfor: "phosphorus_mg",
};

export interface FridaParameter {
  eurofir?: string | null;
  nameDa?: string | null;
  value: number | null | undefined;
}

export function mapFridaParameters(params: FridaParameter[]): NutrientMap {
  const out: NutrientMap = {};
  for (const p of params) {
    if (typeof p.value !== "number" || !Number.isFinite(p.value)) continue;
    const byCode = p.eurofir ? FRIDA_EUROFIR[p.eurofir.toUpperCase()] : undefined;
    const key =
      byCode?.key ??
      (p.nameDa ? FRIDA_DA[p.nameDa.trim().toLowerCase()] : undefined);
    if (!key) continue;
    const factor = byCode?.factor ?? 1;
    if (out[key] == null) out[key] = p.value * factor;
  }
  return finalizeNutrients(out);
}
