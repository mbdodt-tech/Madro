import { describe, expect, it } from "vitest";
import { ACTIVITY_TYPES, activityKcal } from "./activities";

describe("activities", () => {
  it("MET-formlen: kcal = MET × kg × timer", () => {
    // Løb 9.8 MET, 84 kg, 30 min → 9.8 × 84 × 0.5 = 411.6 → 412
    expect(activityKcal(9.8, 84, 30)).toBe(412);
    // Gåtur 4.3 MET, 70 kg, 60 min → 301
    expect(activityKcal(4.3, 70, 60)).toBe(301);
  });

  it("ugyldige input giver 0 i stedet for NaN", () => {
    expect(activityKcal(0, 84, 30)).toBe(0);
    expect(activityKcal(9.8, 0, 30)).toBe(0);
    expect(activityKcal(9.8, 84, 0)).toBe(0);
    expect(activityKcal(Number.NaN, 84, 30)).toBe(0);
  });

  it("typelisten har unikke id'er og positive MET-værdier", () => {
    const ids = new Set(ACTIVITY_TYPES.map((a) => a.id));
    expect(ids.size).toBe(ACTIVITY_TYPES.length);
    for (const a of ACTIVITY_TYPES) expect(a.met).toBeGreaterThan(0);
  });
});
