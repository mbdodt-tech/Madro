import { describe, expect, it } from "vitest";
import { FRIDA_GROUP_NOVA, fridaNovaGroup } from "./frida-nova";

describe("fridaNovaGroup — DTU-fødevaregruppe → NOVA", () => {
  it("giver whole foods NOVA 1 (havregryn/korn, frugt, kød, fisk)", () => {
    expect(fridaNovaGroup(28)).toBe(1); // Grain and groats
    expect(fridaNovaGroup(51)).toBe(1); // Soft fruit
    expect(fridaNovaGroup(58)).toBe(1); // Beef
    expect(fridaNovaGroup(70)).toBe(1); // Lean fish
    expect(fridaNovaGroup(4)).toBe(1); // Unfermented milk
  });

  it("giver kulinariske ingredienser NOVA 2 (olie, sukker, salt, smør)", () => {
    expect(fridaNovaGroup(94)).toBe(2); // Vegetable fats
    expect(fridaNovaGroup(102)).toBe(2); // Sugar
    expect(fridaNovaGroup(121)).toBe(2); // Salt
    expect(fridaNovaGroup(96)).toBe(2); // Butter
  });

  it("giver forarbejdede fødevarer NOVA 3 (brød, ost, røget fisk, juice)", () => {
    expect(fridaNovaGroup(31)).toBe(3); // Bread
    expect(fridaNovaGroup(13)).toBe(3); // Firm rennet cheese
    expect(fridaNovaGroup(79)).toBe(3); // Fish products
    expect(fridaNovaGroup(186)).toBe(3); // Fruit juice
  });

  it("giver ultraforarbejdet NOVA 4 (slik, chips, fastfood, pålæg)", () => {
    expect(fridaNovaGroup(182)).toBe(4); // Candy
    expect(fridaNovaGroup(143)).toBe(4); // Chips and snacks
    expect(fridaNovaGroup(131)).toBe(4); // Sandwich, burger, hotdog
    expect(fridaNovaGroup(65)).toBe(4); // Cold cuts
    expect(fridaNovaGroup(34)).toBe(4); // Breakfast products (cornflakes)
  });

  it("lader genuint blandede grupper være null (ærlig tom bue)", () => {
    expect(fridaNovaGroup(5)).toBeNull(); // Fermented milk (naturel vs. frugt)
    expect(fridaNovaGroup(111)).toBeNull(); // Water and carbonated
    expect(fridaNovaGroup(6)).toBeNull(); // Breast milk / infant formula
  });

  it("returnerer null for ukendte grupper og tomme værdier — aldrig en gætte-score", () => {
    expect(fridaNovaGroup(99999)).toBeNull();
    expect(fridaNovaGroup(null)).toBeNull();
    expect(fridaNovaGroup(undefined)).toBeNull();
    expect(fridaNovaGroup("")).toBeNull();
    expect(fridaNovaGroup("abc")).toBeNull();
  });

  it("accepterer numerisk streng (som Frida-eksporten leverer)", () => {
    expect(fridaNovaGroup("28")).toBe(1);
    expect(fridaNovaGroup("182")).toBe(4);
  });

  it("mapper kun til gyldige NOVA-værdier eller null", () => {
    for (const v of Object.values(FRIDA_GROUP_NOVA)) {
      expect(v === null || [1, 2, 3, 4].includes(v)).toBe(true);
    }
  });
});
