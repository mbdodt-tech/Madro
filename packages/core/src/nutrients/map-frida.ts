import { finalizeNutrients } from "./convert";
import type { NutrientKey, NutrientMap } from "./keys";

/**
 * Frida (DTU) → kanoniske nøgler. Bygget mod den officielle FCDB-eksport
 * (data.dtu.dk, DOI 10.11583/DTU.32312844): ark `Data_Table` er bredt med
 * én kolonne pr. parameter (dansk navn). Vi vælger ÉN kolonne pr.
 * kanonisk nøgle (analyseret værdi frem for deklaration/kJ). Alle valgte
 * kolonners enheder matcher allerede den kanoniske nøgles enhed
 * (verificeret mod `Parameter`-arket), så ingen skalering er nødvendig.
 */
export const FRIDA_COLUMN_MAP: Record<string, NutrientKey> = {
  "Energi (kcal)": "energy_kcal",
  Protein: "protein_g",
  "Tilgængelig kulhydrat": "carbohydrate_g",
  "Sum sukkerarter": "sugars_g",
  Fedt: "fat_g",
  "Sum mættede fedtsyrer": "saturated_fat_g",
  Kostfibre: "fiber_g",
  "Salt deklaration": "salt_g",
  Natrium: "sodium_mg",
  "A-vitamin": "vitamin_a_re_ug",
  "C-vitamin": "vitamin_c_mg",
  "D-vitamin": "vitamin_d_ug",
  "E-vitamin": "vitamin_e_mg",
  "Thiamin (B1-vitamin)": "thiamin_mg",
  "Riboflavin (B2-vitamin)": "riboflavin_mg",
  "B6-vitamin": "vitamin_b6_mg",
  Folat: "folate_ug",
  "B12-vitamin": "vitamin_b12_ug",
  Calcium: "calcium_mg",
  Jern: "iron_mg",
  Magnesium: "magnesium_mg",
  Kalium: "potassium_mg",
  Zink: "zinc_mg",
  Selen: "selenium_ug",
  Jod: "iodine_ug",
  Fosfor: "phosphorus_mg",
};

/** Frida bruger komma som decimaltegn i regnearket. */
function parseNumber(raw: unknown): number | null {
  if (raw == null || raw === "" || raw === "NULL") return null;
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * `row`: én fødevare-række fra Data_Table, nøglet på danske kolonnenavne.
 */
export function mapFridaColumns(row: Record<string, unknown>): NutrientMap {
  const out: NutrientMap = {};
  for (const [column, key] of Object.entries(FRIDA_COLUMN_MAP)) {
    const value = parseNumber(row[column]);
    if (value != null) out[key] = value;
  }
  return finalizeNutrients(out);
}
