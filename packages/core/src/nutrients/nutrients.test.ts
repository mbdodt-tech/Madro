import { describe, expect, it } from "vitest";
import {
  finalizeNutrients,
  kjToKcal,
  scalePer100,
  sodiumMgToSaltG,
} from "./convert";
import { fillNutrientGaps, hasMicroData } from "./enrich";
import { mapOffNutriments } from "./map-off";
import { mapUsdaNutrients, type UsdaFoodNutrient } from "./map-usda";
import { mapFridaColumns } from "./map-frida";
import { dailyReference, coveragePct, type ReferenceRow } from "./reference";

describe("convert", () => {
  it("kJ→kcal and sodium→salt", () => {
    expect(kjToKcal(418.4)).toBeCloseTo(100, 5);
    expect(sodiumMgToSaltG(400)).toBeCloseTo(1, 5);
  });

  it("derives salt from sodium and drops junk", () => {
    const out = finalizeNutrients({ sodium_mg: 400, protein_g: -5, fat_g: NaN });
    expect(out.salt_g).toBeCloseTo(1, 3);
    expect(out.protein_g).toBeUndefined();
    expect(out.fat_g).toBeUndefined();
  });

  it("scales per-100g values to a portion", () => {
    expect(scalePer100(46, 100)).toBe(46);
    expect(scalePer100(46, 250)).toBeCloseTo(115, 5);
    expect(scalePer100(3.5, 125)).toBeCloseTo(4.375, 5);
    expect(scalePer100(46, 0)).toBe(0);
  });
});

describe("enrich", () => {
  it("hasMicroData: kun mikronøgler tæller, 0 er data", () => {
    expect(hasMicroData({})).toBe(false);
    expect(hasMicroData({ energy_kcal: 446, protein_g: 17 })).toBe(false);
    expect(hasMicroData({ calcium_mg: 0 })).toBe(true);
    expect(hasMicroData({ iron_mg: 7.7 })).toBe(true);
  });

  it("fillNutrientGaps: egne værdier vinder, opslaget fylder huller", () => {
    const out = fillNutrientGaps(
      { energy_kcal: 446, protein_g: 17 },
      { energy_kcal: 486, protein_g: 16.5, calcium_mg: 631, magnesium_mg: 335 },
    );
    expect(out.energy_kcal).toBe(446);
    expect(out.protein_g).toBe(17);
    expect(out.calcium_mg).toBe(631);
    expect(out.magnesium_mg).toBe(335);
  });

  it("fillNutrientGaps: tom vare adopterer hele opslaget og finaliseres", () => {
    const out = fillNutrientGaps({}, { energy_kcal: 54.193, sodium_mg: 400 });
    expect(out.energy_kcal).toBeCloseTo(54.193, 3);
    expect(out.salt_g).toBeCloseTo(1, 3); // udledt af natrium
  });
});

describe("mapOffNutriments", () => {
  it("maps names and converts mineral grams to mg/µg", () => {
    const out = mapOffNutriments([
      { name: "energy-kcal", per100g: 46 },
      { name: "proteins", per100g: 3.5 },
      { name: "iron", per100g: 0.0012 }, // 1.2 mg som gram
      { name: "sodium", per100g: 0.04 }, // 40 mg
      { name: "unknown", per100g: 9 },
    ]);
    expect(out.energy_kcal).toBe(46);
    expect(out.iron_mg).toBeCloseTo(1.2, 3);
    expect(out.sodium_mg).toBeCloseTo(40, 3);
    expect(out.salt_g).toBeCloseTo(0.1, 3); // afledt
  });
});

describe("mapUsdaNutrients", () => {
  const n = (number: string, unitName: string, amount: number): UsdaFoodNutrient => ({
    nutrient: { number, unitName },
    amount,
  });

  it("maps by nutrient number and scales units", () => {
    const out = mapUsdaNutrients([
      n("208", "KCAL", 379),
      n("203", "G", 13.2),
      n("303", "MG", 4.3), // jern
      n("304", "MG", 138), // magnesium
      n("291", "G", 10.1), // fiber
      n("418", "UG", 0), // b12
    ]);
    expect(out.energy_kcal).toBe(379);
    expect(out.protein_g).toBe(13.2);
    expect(out.iron_mg).toBeCloseTo(4.3, 3);
    expect(out.magnesium_mg).toBe(138);
    expect(out.fiber_g).toBeCloseTo(10.1, 3);
  });

  it("prefers energy 208 over Atwater 957", () => {
    const out = mapUsdaNutrients([n("957", "KCAL", 400), n("208", "KCAL", 379)]);
    expect(out.energy_kcal).toBe(379);
  });
});

describe("mapFridaColumns", () => {
  it("maps exact Danish column names, parses comma decimals, ignores unknowns", () => {
    const out = mapFridaColumns({
      "Energi (kcal)": "370,5",
      Jern: "4,0",
      Magnesium: 130,
      "Sum mættede fedtsyrer": "1,2",
      "Energi, deklaration (kcal)": "999", // ignoreres — ikke i mappen
      Ukendt: "5",
    });
    expect(out.energy_kcal).toBeCloseTo(370.5, 3);
    expect(out.iron_mg).toBe(4);
    expect(out.magnesium_mg).toBe(130);
    expect(out.saturated_fat_g).toBeCloseTo(1.2, 3);
    expect(Object.keys(out)).not.toContain("undefined");
  });
});

describe("dailyReference", () => {
  const rows: ReferenceRow[] = [
    { nutrient_key: "iron_mg", region: "DK", sex: "male", age_min: 18, age_max: 60, rda: 9, ul: 25, unit: "mg" },
    { nutrient_key: "iron_mg", region: "DK", sex: "female", age_min: 18, age_max: 50, rda: 15, ul: 25, unit: "mg" },
    { nutrient_key: "iron_mg", region: "DK", sex: "any", age_min: 0, age_max: 150, rda: 9, ul: 25, unit: "mg" },
  ];

  it("prefers exact sex match within age range", () => {
    const row = dailyReference(rows, "iron_mg", { sex: "female", age: 30, region: "DK" });
    expect(row?.rda).toBe(15);
  });

  it("falls back to 'any' when no sex-specific row matches age", () => {
    const row = dailyReference(rows, "iron_mg", { sex: "female", age: 70, region: "DK" });
    expect(row?.sex).toBe("any");
  });

  it("computes coverage percent", () => {
    const row = dailyReference(rows, "iron_mg", { sex: "male", age: 35, region: "DK" })!;
    expect(coveragePct(4.5, row)).toBeCloseTo(50, 3);
  });
});
