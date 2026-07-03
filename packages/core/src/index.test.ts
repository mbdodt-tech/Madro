import { describe, expect, it } from "vitest";
import { formatGrams } from "./index";

describe("formatGrams", () => {
  it("formats whole grams with unit", () => {
    expect(formatGrams(120)).toBe("120 g");
  });

  it("uses Danish decimal comma", () => {
    expect(formatGrams(6.2)).toBe("6,2 g");
  });

  it("respects an explicit locale", () => {
    expect(formatGrams(6.2, "en-US")).toBe("6.2 g");
  });
});
