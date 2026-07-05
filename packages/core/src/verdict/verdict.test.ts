import { describe, expect, it } from "vitest";
import { computeVerdict, verdictLevelFor } from "./verdict";

function score(input: Parameters<typeof computeVerdict>[0]): number {
  const r = computeVerdict(input);
  if (r.insufficient) throw new Error("unexpected insufficient");
  return r.score;
}

describe("computeVerdict — kalibrerings-eksempler (docs/scoring.md)", () => {
  it("KiMs Peanuts (a, NOVA 3, 0 additiver) → 81 Fremragende", () => {
    const r = computeVerdict({ nutriscore: "a", novaGroup: 3, additivesCount: 0 });
    expect(r).toMatchObject({ insufficient: false, score: 81, level: "excellent" });
  });

  it("Snackchips (d, NOVA 4, 2 additiver) → 29 Ringe", () => {
    const r = computeVerdict({ nutriscore: "d", novaGroup: 4, additivesCount: 2 });
    expect(r).toMatchObject({ insufficient: false, score: 29, level: "poor" });
  });

  it("Smør (e, NOVA 2, 0 additiver) → 46 Middel", () => {
    const r = computeVerdict({ nutriscore: "e", novaGroup: 2, additivesCount: 0 });
    expect(r).toMatchObject({ insufficient: false, score: 46, level: "mid" });
  });

  it("Havregryn (a, NOVA 1, 0 additiver) → 100 Fremragende", () => {
    expect(score({ nutriscore: "a", novaGroup: 1, additivesCount: 0 })).toBe(100);
  });

  it("Sodavand (e, NOVA 4, 3 additiver) → Meget ringe", () => {
    const r = computeVerdict({ nutriscore: "e", novaGroup: 4, additivesCount: 3 });
    expect(r).toMatchObject({ insufficient: false, level: "bad" });
  });
});

describe("computeVerdict — manglende data", () => {
  it("uden Nutri-Score omvægtes NOVA+additiver proportionalt", () => {
    // NOVA 1 (100) vægt 0.35/0.5, additiver 0 (100) vægt 0.15/0.5 → 100
    expect(score({ nutriscore: null, novaGroup: 1, additivesCount: 0 })).toBe(100);
    // NOVA 4 (10) og 0 additiver (100): 10*0.7 + 100*0.3 = 37
    expect(score({ nutriscore: null, novaGroup: 4, additivesCount: 0 })).toBe(37);
  });

  it("uden NOVA omvægtes Nutri+additiver", () => {
    // a (100) 0.5/0.65 + 0 add (100) 0.15/0.65 → 100
    expect(score({ nutriscore: "a", novaGroup: null, additivesCount: 0 })).toBe(100);
  });

  it("uden additiv-info bruges kun Nutri+NOVA", () => {
    // b (80)*0.5/0.85 + NOVA 2 (75)*0.35/0.85 = 47.06+30.88 = 78
    expect(score({ nutriscore: "b", novaGroup: 2, additivesCount: null })).toBe(78);
  });

  it("uden både Nutri-Score og NOVA → insufficient (ingen opfundet score)", () => {
    expect(
      computeVerdict({ nutriscore: null, novaGroup: null, additivesCount: 0 }),
    ).toEqual({ insufficient: true });
    expect(
      computeVerdict({ nutriscore: "x", novaGroup: 7, additivesCount: 0 }),
    ).toEqual({ insufficient: true });
  });
});

describe("verdictLevelFor — niveaugrænser", () => {
  it.each([
    [100, "excellent"],
    [80, "excellent"],
    [79, "good"],
    [60, "good"],
    [59, "mid"],
    [40, "mid"],
    [39, "poor"],
    [20, "poor"],
    [19, "bad"],
    [0, "bad"],
  ])("%i → %s", (s, level) => {
    expect(verdictLevelFor(s)).toBe(level);
  });
});

describe("computeVerdict — komponentvægte", () => {
  it("summerer effektive vægte til 1", () => {
    const r = computeVerdict({ nutriscore: "c", novaGroup: null, additivesCount: 1 });
    if (r.insufficient) throw new Error("unexpected");
    const total = r.components.reduce((s, c) => s + c.weight, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});
