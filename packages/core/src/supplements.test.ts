import { describe, expect, it } from "vitest";
import { convertToGrams } from "./portions/portions";
import { isSupplementFood, SUPPLEMENT_CATEGORY } from "./supplements";

describe("supplements", () => {
  it("tablet-enheden: 1 tablet = 1 g", () => {
    expect(convertToGrams("tablet", 1)).toBe(1);
    expect(convertToGrams("tablet", 3)).toBe(3);
    expect(convertToGrams("tablet", 0)).toBeNull();
  });

  it("genkender kosttilskud på egen-vare-kategori og navn", () => {
    expect(
      isSupplementFood({ source: "custom", categories: [SUPPLEMENT_CATEGORY] }),
    ).toBe(true);
    expect(isSupplementFood({ name: "Multivitamin mand 50+" })).toBe(true);
    expect(isSupplementFood({ name: "D-vitamin 38 µg tabletter" })).toBe(true);
    expect(isSupplementFood({ name: "Omega-3 kapsler" })).toBe(true);
    expect(isSupplementFood({ name: "Kosttilskud jern + C" })).toBe(true);
  });

  it("matcher IKKE almindelige varer (vitaminvand- og proteindrik-fælden)", () => {
    expect(isSupplementFood({ name: "Vitaminvand hindbær" })).toBe(false);
    expect(isSupplementFood({ name: "Skyr Natural" })).toBe(false);
    expect(isSupplementFood({ name: "Blåbær, rå", categories: ["en:berries"] })).toBe(
      false,
    );
    // OFF tagger proteindrikke som dietary-supplements — delte varer må
    // ikke gå i tabletter på kategorien alene (telefontest 2026-07-09).
    expect(
      isSupplementFood({
        name: "High protein drink",
        source: "off",
        categories: [SUPPLEMENT_CATEGORY, "en:protein-shakes"],
      }),
    ).toBe(false);
  });
});
