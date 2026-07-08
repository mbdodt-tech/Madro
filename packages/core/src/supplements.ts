/**
 * Kosttilskud (2026-07-08, brugerønske): vitamintabletter logges i
 * tabletter frem for gram. Konvention: 1 tablet = 1 g, og næringstal
 * gemmes pr. 100 g = pr. tablet × 100 — så alle rollups er uændrede.
 */

/** OFF-kategorien der markerer kosttilskud; sættes også på egne varer. */
export const SUPPLEMENT_CATEGORY = "en:dietary-supplements";

/** Bevidst konservativt navnemønster: hellere et misset tilskud (bruger
 *  kan stadig logge i gram) end en drikkevare vist i tabletter
 *  ("vitaminvand" må IKKE matche). */
const SUPPLEMENT_NAME = /multivitamin|vitaminpille|kosttilskud|supplement\b|\btabletter?\b/i;

export function isSupplementFood(food: {
  name?: string | null;
  categories?: string[] | null;
}): boolean {
  if (food.categories?.includes(SUPPLEMENT_CATEGORY)) return true;
  return SUPPLEMENT_NAME.test(food.name ?? "");
}
