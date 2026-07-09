/**
 * Kosttilskud (2026-07-08, brugerønske): vitamintabletter logges i
 * tabletter frem for gram. Konvention: 1 tablet = 1 g, og næringstal
 * gemmes pr. 100 g = pr. tablet × 100 — så alle rollups er uændrede.
 */

/** OFF-kategorien der markerer kosttilskud; sættes også på egne varer. */
export const SUPPLEMENT_CATEGORY = "en:dietary-supplements";

/** Bevidst konservativt navnemønster: hellere et misset tilskud (bruger
 *  kan stadig logge i gram — og skifte i portionsvælgeren) end en
 *  drikkevare vist i tabletter. "vitaminvand" og "protein supplement
 *  drink" må IKKE matche; navnet skal signalere tablet-/kapselform. */
const SUPPLEMENT_NAME =
  /multivitamin|vitaminpille|kosttilskud|\btabletter?\b|\bkapsler?\b|\bcapsules?\b/i;

export function isSupplementFood(food: {
  name?: string | null;
  categories?: string[] | null;
  source?: string | null;
}): boolean {
  // Egne varer: kategorien sættes bevidst af kosttilskudstilstanden i
  // deklarationsfotoet — den kan vi stole på.
  if (
    food.source === "custom" &&
    food.categories?.includes(SUPPLEMENT_CATEGORY)
  ) {
    return true;
  }
  // OFF tagger fx proteindrikke som en:dietary-supplements (telefontest
  // 2026-07-09) — kategorien alene er derfor IKKE nok for delte varer.
  return SUPPLEMENT_NAME.test(food.name ?? "");
}
