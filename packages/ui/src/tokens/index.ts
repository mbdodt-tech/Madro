/**
 * Token-konstanter til JS-siden. Farveværdier refererer altid CSS-vars
 * fra tokens.css — aldrig hex — så lys/mørk følger automatisk med.
 */

export const verdictLevels = [
  "excellent",
  "good",
  "mid",
  "poor",
  "bad",
] as const;

export type VerdictLevel = (typeof verdictLevels)[number];

export const verdictColor: Record<VerdictLevel, string> = {
  excellent: "var(--v-excellent)",
  good: "var(--v-good)",
  mid: "var(--v-mid)",
  poor: "var(--v-poor)",
  bad: "var(--v-bad)",
};

export const macroColor = {
  protein: "var(--macro-protein)",
  carb: "var(--macro-carb)",
  fat: "var(--macro-fat)",
} as const;

export type Macro = keyof typeof macroColor;

/** Framer Motion-spring til al interaktion (byggeplan §3.5 / CLAUDE.md). */
export const spring = {
  type: "spring",
  stiffness: 300,
  damping: 30,
} as const;

/** Varigheder i ms til ikke-spring-overgange (§3.5: 180-260 ms). */
export const durations = { fast: 180, base: 220, slow: 260 } as const;
