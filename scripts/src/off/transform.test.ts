import { describe, expect, it } from "vitest";
import {
  imagePath,
  pickImageUrl,
  pickLang,
  pickNutriments,
  transformOffRow,
  type OffRow,
} from "./transform";

const base: OffRow = {
  code: "5711953068881",
  lang: "da",
  product_name: [
    { lang: "da", text: "Letmælk" },
    { lang: "en", text: "Semi-skimmed milk" },
  ],
  brands: "Arla",
  categories_tags: ["en:milks"],
  nova_group: 1,
  nutriscore_grade: "b",
  additives_tags: [],
  allergens_tags: ["en:milk"],
  nutriments: [
    { name: "energy-kcal", "100g": 46 },
    { name: "proteins", "100g": 3.5 },
    { name: "obscure-nutrient", "100g": 1 },
    { name: "fat", "100g": null },
    { name: "iron", "100g": 0.0012 },
  ],
  images: [{ key: "front_da", rev: 7 }],
};

describe("pickLang", () => {
  it("prefers Danish, then English, then main language", () => {
    expect(pickLang(base.product_name, "fr")).toBe("Letmælk");
    expect(
      pickLang(
        [
          { lang: "en", text: "Milk" },
          { lang: "fr", text: "Lait" },
        ],
        "fr",
      ),
    ).toBe("Milk");
    expect(pickLang([{ lang: "fr", text: "Lait" }], "fr")).toBe("Lait");
  });

  it("skips empty entries", () => {
    expect(pickLang([{ lang: "da", text: "  " }], "da")).toBeNull();
  });
});

describe("transformOffRow", () => {
  it("maps a valid row", () => {
    const row = transformOffRow(base)!;
    expect(row.source).toBe("off");
    expect(row.data_quality).toBe("crowdsourced");
    expect(row.barcode).toBe("5711953068881");
    expect(row.name).toBe("Letmælk");
    expect(row.nova_group).toBe(1);
    expect(row.nutriscore).toBe("b");
    expect(row.nutriments).toEqual({
      energy_kcal: 46,
      protein_g: 3.5,
      iron_mg: 1.2,
    });
    expect(row.image_url).toBe(
      "https://images.openfoodfacts.org/images/products/571/195/306/8881/front_da.7.400.jpg",
    );
  });

  it("rejects rows without a usable name or code", () => {
    expect(transformOffRow({ ...base, product_name: [] })).toBeNull();
    expect(transformOffRow({ ...base, code: "abc" })).toBeNull();
    expect(transformOffRow({ ...base, code: "" })).toBeNull();
  });

  it("nulls out-of-range nova and invalid nutriscore", () => {
    const row = transformOffRow({
      ...base,
      nova_group: 7,
      nutriscore_grade: "unknown",
    })!;
    expect(row.nova_group).toBeNull();
    expect(row.nutriscore).toBeNull();
  });
});

describe("helpers", () => {
  it("splits long codes 3/3/3/rest and keeps short codes flat", () => {
    expect(imagePath("5711953068881")).toBe("571/195/306/8881");
    expect(imagePath("12345678")).toBe("12345678");
  });

  it("falls back to any front_* image and requires a rev", () => {
    expect(
      pickImageUrl([{ key: "front_sv", rev: 3 }], "5711953068881"),
    ).toContain("front_sv.3.400.jpg");
    expect(pickImageUrl([{ key: "front_da", rev: null }], "5711953068881")).toBeNull();
    expect(pickImageUrl([], "5711953068881")).toBeNull();
  });

  it("maps to canonical keys and derives from grams", () => {
    expect(pickNutriments(base.nutriments)).toEqual({
      energy_kcal: 46,
      protein_g: 3.5,
      iron_mg: 1.2,
    });
  });
});
