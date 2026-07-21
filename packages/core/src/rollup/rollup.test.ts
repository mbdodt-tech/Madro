import { describe, expect, it } from "vitest";
import type { ReferenceRow } from "../nutrients/reference";
import {
  MICRO_STRIP_KEYS,
  micronutrientCoverage,
  novaShare,
  resolveTargets,
  sumNutrients,
} from "./rollup";

/**
 * Håndberegnede fixtures (acceptkrav 1.6). Dagen:
 *  - 60 g havregryn:  375 kcal/100g, 13 protein, 58 kulhydrat, 7 fedt, 4.2 jern_mg, NOVA 1
 *  - 250 g letmælk:    46 kcal/100g, 3.5 protein, 4.8 kulhydrat, 1.5 fedt, 120 calcium_mg, NOVA 1
 *  - 45 g snackbar:   480 kcal/100g, 6 protein, 55 kulhydrat, 25 fedt, NOVA 4
 * Facit:
 *  kcal   = 375*0.6 + 46*2.5 + 480*0.45 = 225 + 115 + 216   = 556
 *  protein= 13*0.6 + 3.5*2.5 + 6*0.45   = 7.8 + 8.75 + 2.7  = 19.25
 *  kulh.  = 58*0.6 + 4.8*2.5 + 55*0.45  = 34.8 + 12 + 24.75 = 71.55
 *  fedt   = 7*0.6 + 1.5*2.5 + 25*0.45   = 4.2 + 3.75 + 11.25= 19.2
 *  jern   = 4.2*0.6 = 2.52   calcium = 120*2.5 = 300
 *  NOVA-andel = (60+250)/(60+250+45) = 310/355 = 87.3 → 87 %
 */
const OATS = {
  nutriments: {
    energy_kcal: 375, protein_g: 13, carbohydrate_g: 58, fat_g: 7, iron_mg: 4.2,
  },
  grams: 60,
};
const MILK = {
  nutriments: {
    energy_kcal: 46, protein_g: 3.5, carbohydrate_g: 4.8, fat_g: 1.5, calcium_mg: 120,
  },
  grams: 250,
};
const BAR = {
  nutriments: { energy_kcal: 480, protein_g: 6, carbohydrate_g: 55, fat_g: 25 },
  grams: 45,
};

describe("sumNutrients — håndberegnet dagstotal", () => {
  it("summerer på tværs af poster, skaleret pr. 100 g", () => {
    const totals = sumNutrients([OATS, MILK, BAR]);
    expect(totals.energy_kcal).toBeCloseTo(556, 3);
    expect(totals.protein_g).toBeCloseTo(19.25, 3);
    expect(totals.carbohydrate_g).toBeCloseTo(71.55, 3);
    expect(totals.fat_g).toBeCloseTo(19.2, 3);
    expect(totals.iron_mg).toBeCloseTo(2.52, 3);
    expect(totals.calcium_mg).toBeCloseTo(300, 3);
  });

  it("ignorerer poster uden nutriments og ugyldige gram", () => {
    const totals = sumNutrients([
      OATS,
      { nutriments: null, grams: 100 },
      { nutriments: { energy_kcal: 100 }, grams: 0 },
    ]);
    expect(totals.energy_kcal).toBeCloseTo(225, 3);
  });

  it("tom dag → tom map", () => {
    expect(sumNutrients([])).toEqual({});
  });
});

describe("novaShare — gram-vægtet NOVA-andel", () => {
  it("310 g NOVA 1-3 af 355 g kendt → 87 %", () => {
    const share = novaShare([
      { novaGroup: 1, grams: 60 },
      { novaGroup: 1, grams: 250 },
      { novaGroup: 4, grams: 45 },
    ]);
    expect(share).toEqual({ pct: 87, knownGrams: 355, totalGrams: 355 });
  });

  it("poster uden kendt NOVA holdes ude af nævneren", () => {
    const share = novaShare([
      { novaGroup: 1, grams: 100 },
      { novaGroup: null, grams: 900 },
      { novaGroup: 4, grams: 100 },
    ]);
    expect(share).toEqual({ pct: 50, knownGrams: 200, totalGrams: 1100 });
  });

  it("ingen kendt NOVA → null (ingen opfundet andel)", () => {
    expect(novaShare([{ novaGroup: null, grams: 500 }])).toBeNull();
    expect(novaShare([])).toBeNull();
  });
});

describe("resolveTargets — NNR-forenklede defaults + goals-overstyring", () => {
  it("kvinde 2000 kcal → 100 g protein, 250 g kulhydrat, 67 g fedt", () => {
    expect(resolveTargets(null, { sex: "female" })).toEqual({
      kcal: 2000, protein_g: 100, carbohydrate_g: 250, fat_g: 67,
    });
  });

  it("mand 2500 kcal → 125/313/83", () => {
    expect(resolveTargets({}, { sex: "male" })).toEqual({
      kcal: 2500, protein_g: 125, carbohydrate_g: 313, fat_g: 83,
    });
  });

  it("ukendt køn → 2100 (mockuppens reference)", () => {
    expect(resolveTargets(null, { sex: null }).kcal).toBe(2100);
    expect(resolveTargets(null, { sex: "other" }).kcal).toBe(2100);
  });

  it("goals vinder felt for felt; kcal-mål afleder resten", () => {
    const t = resolveTargets({ kcal: 1800, protein_g: 140 }, { sex: "male" });
    expect(t.kcal).toBe(1800);
    expect(t.protein_g).toBe(140); // eksplicit
    expect(t.carbohydrate_g).toBe(225); // 1800*0.5/4
    expect(t.fat_g).toBe(60); // 1800*0.3/9
  });

  it("ugyldige goals-værdier ignoreres", () => {
    expect(resolveTargets({ kcal: -5, protein_g: "hej" }, { sex: "female" }).kcal).toBe(2000);
  });

  it("kostprofiler ændrer fordelingen (2026-07-10): keto ved 2000 kcal", () => {
    const t = resolveTargets({ kcal: 2000, macro_profile: "keto" }, {});
    // protein 25 E% = 125 g · fedt 70 E% = 155,6→156 g · kulhydrat = resten ≈ 25 g
    expect(t.protein_g).toBe(125);
    expect(t.fat_g).toBe(156);
    expect(t.carbohydrate_g).toBe(25);
  });

  it("kostprofil low_carb: 30/25/45-fordeling", () => {
    const t = resolveTargets({ kcal: 2000, macro_profile: "low_carb" }, {});
    expect(t.protein_g).toBe(150); // 30 E%
    expect(t.fat_g).toBe(100); // 45 E%
    expect(t.carbohydrate_g).toBe(125); // resten = 25 E%
  });

  it("ukendt kostprofil falder tilbage på standard", () => {
    expect(resolveTargets({ kcal: 2000, macro_profile: "carnivore" }, {})).toEqual(
      resolveTargets({ kcal: 2000 }, {}),
    );
  });
});

describe("resolveTargets v2 — Mifflin-St Jeor × aktivitetsfaktor (fase 3.1)", () => {
  // Alle fixtures håndregnet: BMR = 10·kg + 6,25·cm − 5·alder + kønskonstant;
  // TDEE = BMR × PAL; ±retning; afrundet til nærmeste 10; bund 1500/1700.
  const year = { referenceYear: 2026 };

  it("kvinde 35 år, 168 cm, 65 kg, moderat: BMR 1364 × 1,6 → 2180 kcal", () => {
    const t = resolveTargets(null, {
      sex: "female", birthYear: 1991, heightCm: 168, weightKg: 65,
      activityLevel: "moderate", ...year,
    });
    // protein: max(E% 109, 1,2·65=78) = 109; fedt 30 E% = 73; kulhydrat = rest
    expect(t).toEqual({ kcal: 2180, protein_g: 109, carbohydrate_g: 273, fat_g: 73 });
  });

  it("mand 30 år, 183 cm, 80 kg, aktiv: BMR 1798,75 × 1,8 → 3240 kcal", () => {
    const t = resolveTargets(null, {
      sex: "male", birthYear: 1996, heightCm: 183, weightKg: 80,
      activityLevel: "active", ...year,
    });
    expect(t.kcal).toBe(3240);
    expect(t.protein_g).toBe(162); // E% (162) > 1,2 g/kg (96)
  });

  it("blidt underskud rammer aldrig under bunden (1500 K)", () => {
    const t = resolveTargets({ direction: "gentle_deficit" }, {
      sex: "female", birthYear: 1946, heightCm: 155, weightKg: 60,
      activityLevel: "sedentary", ...year,
    });
    // 1007,75 × 1,4 − 300 = 1110,85 → bund 1500
    expect(t.kcal).toBe(1500);
  });

  it("1,2 g/kg løfter proteinet når E%-afledningen er lavere", () => {
    const t = resolveTargets({ direction: "gentle_deficit" }, {
      sex: "female", birthYear: 1991, heightCm: 160, weightKg: 100,
      activityLevel: "sedentary", ...year,
    });
    // 1664 × 1,4 − 300 = 2029,6 → 2030; max(E% 101,5, 1,2·100=120) = 120
    expect(t.kcal).toBe(2030);
    expect(t.protein_g).toBe(120);
    // makro-kcal summer stadig ca. til målet (rest-kulhydrat)
    expect(t.protein_g * 4 + t.carbohydrate_g * 4 + t.fat_g * 9)
      .toBeGreaterThan(2030 - 15);
  });

  it("blidt overskud: +300 kcal", () => {
    const t = resolveTargets({ direction: "gentle_surplus" }, {
      sex: "female", birthYear: 1991, heightCm: 168, weightKg: 65,
      activityLevel: "moderate", ...year,
    });
    expect(t.kcal).toBe(2480); // 2182,4 + 300 = 2482,4 → 2480
  });

  it("ukendt køn → kønskonstant-midtpunkt, ukendt aktivitet → moderat", () => {
    const t = resolveTargets(null, {
      sex: null, birthYear: 1991, heightCm: 170, weightKg: 70, ...year,
    });
    // BMR = 700 + 1062,5 − 175 − 78 = 1509,5 × 1,6 = 2415,2 → 2420
    expect(t.kcal).toBe(2420);
  });

  it("ufuldstændig kropsprofil (kun vægt) → gamle defaults, men protein følger vægten", () => {
    const t = resolveTargets(null, { sex: "female", weightKg: 100, ...year });
    expect(t.kcal).toBe(2000); // ingen højde/fødselsår → NNR-forenklet
    expect(t.protein_g).toBe(120); // 1,2 g/kg > E% 100
  });

  it("ukendt retning ignoreres (maintain)", () => {
    const t = resolveTargets({ direction: "aggressiv" }, {
      sex: "female", birthYear: 1991, heightCm: 168, weightKg: 65,
      activityLevel: "moderate", ...year,
    });
    expect(t.kcal).toBe(2180);
  });
});

describe("micronutrientCoverage", () => {
  const rows: ReferenceRow[] = [
    { nutrient_key: "iron_mg", region: "DK", sex: "female", age_min: 18, age_max: 50, rda: 15, ul: null, unit: "mg" },
    { nutrient_key: "calcium_mg", region: "DK", sex: "any", age_min: 18, age_max: 120, rda: 800, ul: null, unit: "mg" },
  ];
  const profile = { sex: "female" as const, age: 35, region: "DK" };

  it("beregner dækning mod reference (jern 2.52/15 → 17 %, calcium 300/800 → 38 %)", () => {
    const totals = sumNutrients([OATS, MILK, BAR]);
    const cov = micronutrientCoverage(totals, rows, profile, ["iron_mg", "calcium_mg"]);
    expect(cov[0]).toMatchObject({ key: "iron_mg", pct: 17, rda: 15 });
    expect(cov[1]).toMatchObject({ key: "calcium_mg", pct: 38, rda: 800 });
  });

  it("manglende reference → pct null (ingen opfundet dækning)", () => {
    const cov = micronutrientCoverage({}, rows, profile, ["vitamin_d_ug"]);
    expect(cov[0]).toMatchObject({ key: "vitamin_d_ug", pct: null, rda: null });
  });

  it("MICRO_STRIP_KEYS er det godkendte 8-sæt", () => {
    expect(MICRO_STRIP_KEYS).toEqual([
      "vitamin_d_ug", "iron_mg", "magnesium_mg", "calcium_mg",
      "potassium_mg", "vitamin_b12_ug", "folate_ug", "zinc_mg",
    ]);
  });
});
