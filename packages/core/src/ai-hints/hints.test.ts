import { describe, expect, it } from "vitest";
import { buildCorrectionHints, type CorrectionPair } from "./hints";

const pair = (
  ai: [string, number][],
  final: [string, number][],
): CorrectionPair => ({
  ai_items: ai.map(([name, grams]) => ({ name, grams })),
  final_items: final.map(([name, grams]) => ({ name, grams })),
});

describe("buildCorrectionHints (fase 3.4)", () => {
  it("under 3 par → ingen hints (ingen læring på tilfældigheder)", () => {
    const p = pair([["ris", 200]], [["ris", 100]]);
    expect(buildCorrectionHints([p, p])).toEqual([]);
  });

  it("konsekvent nedjustering → bias-hint med ca.-procent", () => {
    const pairs = [
      pair([["ris", 200]], [["ris", 100]]),
      pair([["kartofler", 300]], [["kartofler", 150]]),
      pair([["pasta", 180]], [["pasta", 90]]),
    ];
    const hints = buildCorrectionHints(pairs);
    expect(hints).toHaveLength(1);
    expect(hints[0]).toContain("nedjusterer");
    expect(hints[0]).toContain("50 %");
  });

  it("neutrale rettelser (ratio ~1) → ingen bias-hint", () => {
    const pairs = [
      pair([["ris", 200]], [["ris", 210]]),
      pair([["kartofler", 300]], [["kartofler", 290]]),
      pair([["pasta", 180]], [["pasta", 180]]),
    ];
    expect(buildCorrectionHints(pairs)).toEqual([]);
  });

  it("ofte tilføjet post (≥⅓ af parrene) → tilføj-hint", () => {
    const pairs = [
      pair([["salat", 150]], [["salat", 150], ["olie", 14]]),
      pair([["pasta", 180]], [["pasta", 180], ["olie", 10]]),
      pair([["ris", 200]], [["ris", 200]]),
    ];
    const hints = buildCorrectionHints(pairs);
    expect(hints).toHaveLength(1);
    expect(hints[0]).toContain("tilføjer ofte");
    expect(hints[0]).toContain("olie");
  });

  it("ofte fjernet post → fjern-hint; engelsk locale giver engelsk tekst", () => {
    const pairs = [
      pair([["salat", 150], ["dressing", 30]], [["salat", 150]]),
      pair([["pasta", 180], ["dressing", 30]], [["pasta", 180]]),
      pair([["ris", 200]], [["ris", 200]]),
    ];
    const hints = buildCorrectionHints(pairs, "en");
    expect(hints).toHaveLength(1);
    expect(hints[0]).toContain("often removes");
    expect(hints[0]).toContain("dressing");
  });

  it("bias + tilføjelser kombineres, men aldrig flere end 4 hints", () => {
    const pairs = [
      pair([["ris", 200]], [["ris", 100], ["olie", 14]]),
      pair([["pasta", 180]], [["pasta", 90], ["olie", 10]]),
      pair([["kartofler", 300]], [["kartofler", 150], ["olie", 12]]),
    ];
    const hints = buildCorrectionHints(pairs);
    expect(hints.length).toBeGreaterThanOrEqual(2);
    expect(hints.length).toBeLessThanOrEqual(4);
  });
});
