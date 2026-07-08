/**
 * Danske husholdningsmål → gram (fase 3.3).
 *
 * Standardværdier afrundet efter gængse danske husholdningsmål
 * (jf. DTU Fødevareinstituttets "mål og vægt"-konventioner i Frida):
 * en skive rugbrød ~50 g / franskbrød ~30 g → 45 g som generisk skive;
 * spsk 15 ml (olie/smør ~14 g pga. densitet); tsk 5 ml; glas 200 ml;
 * dl 100 ml (væskedensitet ~1 antages); håndfuld ~30 g; æg str. M/L ~60 g;
 * portion kogt ris ~150 g / kogt pasta ~180 g / generisk portion ~250 g.
 * Alt er estimater — UI'et viser fortsat "estimat — ret hvis nødvendigt".
 */

interface UnitHint {
  /** Ord der matches mod fødevarenavnet (små bogstaver, da+en). */
  match: string[];
  grams: number;
}

export interface PortionUnit {
  /** Gram pr. enhed uden yderligere kontekst. */
  grams: number;
  /** Navne-afhængige justeringer (første match vinder). */
  hints?: UnitHint[];
}

export const PORTION_UNITS = {
  g: { grams: 1 },
  slice: { grams: 45 }, // skive (generisk brød)
  piece: {
    grams: 100, // stk (generisk)
    hints: [
      { match: ["æg", "egg"], grams: 60 },
      {
        match: ["æble", "apple", "banan", "banana", "pære", "pear", "appelsin", "orange"],
        grams: 130,
      },
    ],
  },
  tbsp: {
    grams: 15, // spsk
    hints: [{ match: ["olie", "oil", "smør", "butter"], grams: 14 }],
  },
  tsp: { grams: 5 }, // tsk
  dl: { grams: 100 },
  glass: { grams: 200 }, // glas
  handful: { grams: 30 }, // håndfuld
  portion: {
    grams: 250,
    hints: [
      { match: ["ris", "rice"], grams: 150 },
      { match: ["pasta", "spaghetti", "makaroni", "macaroni", "nudler", "noodle"], grams: 180 },
    ],
  },
  /** Kosttilskud (2026-07-08): konventionen er 1 tablet = 1 g, og
   *  tilskuds-varer gemmer næringstal pr. 100 g = pr. tablet × 100,
   *  så rollup-matematikken er uændret. */
  tablet: { grams: 1 },
} as const satisfies Record<string, PortionUnit>;

export type PortionUnitId = keyof typeof PORTION_UNITS;

export const PORTION_UNIT_IDS = Object.keys(PORTION_UNITS) as PortionUnitId[];

/** Gram pr. enhed for en given fødevare (hint = navnet, valgfrit). */
export function unitGrams(unit: PortionUnitId, foodHint?: string | null): number {
  const def: PortionUnit = PORTION_UNITS[unit];
  if (def.hints && foodHint) {
    const name = foodHint.toLowerCase();
    for (const hint of def.hints) {
      if (hint.match.some((word) => name.includes(word))) return hint.grams;
    }
  }
  return def.grams;
}

/**
 * Antal × enhed → gram, afrundet til helt gram. Ugyldigt antal → null
 * (kalderen beholder sin nuværende værdi frem for at gætte).
 */
export function convertToGrams(
  unit: PortionUnitId,
  count: number,
  foodHint?: string | null,
): number | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return Math.round(count * unitGrams(unit, foodHint));
}
