import { finalizeNutrients } from "./convert";
import { NUTRIENT_INFO, NUTRIENT_KEYS, type NutrientMap } from "./keys";

/**
 * Har kortet mindst én mikroværdi? Et eksplicit 0 tæller som data
 * ("målt til nul") — kun manglende nøgler regnes som huller.
 */
export function hasMicroData(map: NutrientMap): boolean {
  return NUTRIENT_KEYS.some((key) => NUTRIENT_INFO[key].micro && map[key] != null);
}

/**
 * Udfyld huller i en næringsmap fra et verificeret opslag (Frida/USDA):
 * eksisterende værdier — typisk varens egen deklaration — vinder ALTID;
 * opslaget fylder kun de manglende nøgler. Bruges af "hent fra
 * verificeret opslag"-flowene (deklarationsfoto + dagbogsreparation).
 */
export function fillNutrientGaps(
  existing: NutrientMap,
  verified: NutrientMap,
): NutrientMap {
  const merged: NutrientMap = { ...existing };
  for (const key of NUTRIENT_KEYS) {
    if (merged[key] == null && verified[key] != null) {
      merged[key] = verified[key];
    }
  }
  return finalizeNutrients(merged);
}
