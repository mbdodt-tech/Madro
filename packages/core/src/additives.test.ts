import { describe, expect, it } from "vitest";
import { lookupAdditive } from "./additives";

describe("additives", () => {
  it("normaliserer OFF-koder og slår kendte stoffer op", () => {
    expect(lookupAdditive("en:e330")).toEqual({
      code: "E330",
      info: expect.objectContaining({ nameDa: "Citronsyre" }),
    });
    expect(lookupAdditive("E415").info?.categoryEn).toBe("thickener");
  });

  it("ukendte koder returnerer null-info men pæn kode", () => {
    const result = lookupAdditive("en:e999");
    expect(result.code).toBe("E999");
    expect(result.info).toBeNull();
  });
});
