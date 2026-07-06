import { describe, expect, it } from "vitest";
import { convertToGrams, unitGrams } from "./portions";

describe("husholdningsmål → gram (fase 3.3)", () => {
  it("generiske enheder", () => {
    expect(convertToGrams("g", 137)).toBe(137);
    expect(convertToGrams("slice", 2)).toBe(90); // 2 skiver brød
    expect(convertToGrams("tsp", 1)).toBe(5);
    expect(convertToGrams("dl", 2.5)).toBe(250);
    expect(convertToGrams("glass", 1)).toBe(200);
    expect(convertToGrams("handful", 1)).toBe(30);
  });

  it("navne-hints justerer enheden (første match vinder)", () => {
    expect(unitGrams("piece", "Æg, kogt")).toBe(60);
    expect(unitGrams("piece", "Æble, rødt")).toBe(130);
    expect(unitGrams("piece", "Frikadelle")).toBe(100);
    expect(unitGrams("tbsp", "Olivenolie")).toBe(14);
    expect(unitGrams("tbsp", "Ketchup")).toBe(15);
    expect(unitGrams("portion", "Ris, kogte")).toBe(150);
    expect(unitGrams("portion", "Spaghetti, kogt")).toBe(180);
    expect(unitGrams("portion", "Lasagne")).toBe(250);
  });

  it("halve og skæve antal afrundes til helt gram", () => {
    expect(convertToGrams("tbsp", 1.5, "smør")).toBe(21); // 1,5 × 14
    expect(convertToGrams("piece", 0.5, "æg")).toBe(30);
  });

  it("ugyldigt antal → null (ingen gæt)", () => {
    expect(convertToGrams("slice", 0)).toBeNull();
    expect(convertToGrams("slice", -1)).toBeNull();
    expect(convertToGrams("slice", Number.NaN)).toBeNull();
  });
});
