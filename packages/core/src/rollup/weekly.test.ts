import { describe, expect, it } from "vitest";
import type { ReferenceRow } from "../nutrients/reference";
import { buildWeeklyStats, type DaySummaryInput } from "./weekly";

/**
 * Håndberegnet uge-fixture (accept 2.4):
 *  man: kcal 1800, nova 90, protein 80, jern 8/15 = 53 %
 *  tir: kcal 2200, nova 70, protein 100, jern 12/15 = 80 %
 *  ons: (ikke logget)
 *  tor: kcal 2000, nova 80, protein 90, ingen jern spist → 0 % den dag
 * Facit: daysLogged 3, avgKcal 2000, avgNova 80, avgProtein 90,
 *        jern-middel = (53.33+80+0)/3 = 44.44 → 44
 *        (en logget dag uden jern ER 0 % dækning — ikke manglende data)
 */
const ROWS: ReferenceRow[] = [
  { nutrient_key: "iron_mg", region: "DK", sex: "female", age_min: 18, age_max: 50, rda: 15, ul: null, unit: "mg" },
];
const PROFILE = { sex: "female" as const, age: 35, region: "DK" };

const DAYS: DaySummaryInput[] = [
  { day: "2026-07-06", kcal: 1800, macros: { protein_g: 80 }, micros: { iron_mg: 8 }, novaShare: 90 },
  { day: "2026-07-07", kcal: 2200, macros: { protein_g: 100 }, micros: { iron_mg: 12 }, novaShare: 70 },
  { day: "2026-07-08", kcal: null, macros: {}, micros: {}, novaShare: null },
  { day: "2026-07-09", kcal: 2000, macros: { protein_g: 90 }, micros: {}, novaShare: 80 },
];

describe("buildWeeklyStats", () => {
  it("beregner ugens gennemsnit korrekt (håndberegnet fixture)", () => {
    const stats = buildWeeklyStats(DAYS, ROWS, PROFILE);
    expect(stats.daysLogged).toBe(3);
    expect(stats.avgKcal).toBe(2000);
    expect(stats.avgNovaShare).toBe(80);
    expect(stats.avgProteinG).toBe(90);
  });

  it("trend har alle dage inkl. hul", () => {
    const stats = buildWeeklyStats(DAYS, ROWS, PROFILE);
    expect(stats.trend).toHaveLength(4);
    expect(stats.trend[2]).toEqual({ day: "2026-07-08", kcal: null, novaShare: null });
  });

  it("lowestMicros er middel over LOGGEDE dage — jern (53+80+0)/3 → 44 %", () => {
    const stats = buildWeeklyStats(DAYS, ROWS, PROFILE);
    const iron = stats.lowestMicros.find((m) => m.key === "iron_mg");
    expect(iron?.pct).toBe(44);
    expect(iron?.name.da).toBe("Jern");
  });

  it("tom uge → nuller og null-gennemsnit", () => {
    const stats = buildWeeklyStats(
      [{ day: "2026-07-06", kcal: null, macros: {}, micros: {}, novaShare: null }],
      ROWS,
      PROFILE,
    );
    expect(stats.daysLogged).toBe(0);
    expect(stats.avgKcal).toBeNull();
    expect(stats.avgNovaShare).toBeNull();
    expect(stats.lowestMicros).toEqual([]);
  });
});
