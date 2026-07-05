import { finalizeNutrients, kjToKcal } from "./convert";
import type { NutrientKey, NutrientMap } from "./keys";

/**
 * USDA FoodData Central → kanoniske nøgler. Mapping på USDA's stabile
 * nutrient-numre. Foundation Foods bruger ofte Atwater-energi (957/958)
 * i stedet for 208 — vi foretrækker 208, dernæst 957, dernæst 958.
 */
const USDA_MAP: Record<string, NutrientKey> = {
  "203": "protein_g",
  "204": "fat_g",
  "205": "carbohydrate_g",
  "269": "sugars_g",
  "606": "saturated_fat_g",
  "291": "fiber_g",
  "307": "sodium_mg",
  "301": "calcium_mg",
  "303": "iron_mg",
  "304": "magnesium_mg",
  "305": "phosphorus_mg",
  "306": "potassium_mg",
  "309": "zinc_mg",
  "317": "selenium_ug",
  "314": "iodine_ug",
  "320": "vitamin_a_re_ug", // RAE ≈ RE til vores formål
  "401": "vitamin_c_mg",
  "328": "vitamin_d_ug", // D2+D3
  "323": "vitamin_e_mg", // alfa-tokoferol
  "404": "thiamin_mg",
  "405": "riboflavin_mg",
  "415": "vitamin_b6_mg",
  "417": "folate_ug",
  "418": "vitamin_b12_ug",
};

const ENERGY_PRIORITY = ["208", "957", "958"];

export interface UsdaFoodNutrient {
  nutrient: { number: string; unitName: string };
  amount?: number | null;
}

/** Skalér til den kanoniske nøgles enhed ud fra USDA's unitName. */
function scale(key: NutrientKey, amount: number, unitName: string): number | null {
  const unit = unitName.toLowerCase();
  const wants = key.endsWith("_g")
    ? "g"
    : key.endsWith("_mg")
      ? "mg"
      : key.endsWith("_ug")
        ? "µg"
        : "kcal";
  const factors: Record<string, Record<string, number>> = {
    g: { g: 1, mg: 0.001, µg: 0.000001, ug: 0.000001 },
    mg: { g: 1000, mg: 1, µg: 0.001, ug: 0.001 },
    µg: { g: 1_000_000, mg: 1000, µg: 1, ug: 1 },
  };
  if (wants === "kcal") {
    if (unit === "kcal") return amount;
    if (unit === "kj") return kjToKcal(amount);
    return null;
  }
  const factor = factors[wants]?.[unit];
  return factor == null ? null : amount * factor;
}

export function mapUsdaNutrients(entries: UsdaFoodNutrient[]): NutrientMap {
  const out: NutrientMap = {};

  for (const number of ENERGY_PRIORITY) {
    const hit = entries.find(
      (e) =>
        e.nutrient.number === number &&
        e.nutrient.unitName.toLowerCase() === "kcal" &&
        typeof e.amount === "number",
    );
    if (hit) {
      out.energy_kcal = hit.amount!;
      break;
    }
  }

  for (const entry of entries) {
    const key = USDA_MAP[entry.nutrient.number];
    if (!key) continue;
    if (typeof entry.amount !== "number" || !Number.isFinite(entry.amount)) continue;
    const value = scale(key, entry.amount, entry.nutrient.unitName);
    if (value == null) continue;
    // Første forekomst vinder (dubletter forekommer i SR Legacy)
    if (out[key] == null) out[key] = value;
  }

  return finalizeNutrients(out);
}
