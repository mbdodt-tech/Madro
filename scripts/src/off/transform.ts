/**
 * Ren transformation: én række fra OFF's parquet-eksport → én række i
 * `foods`. Denne fil ER den ODbL-krævede beskrivelse af vores
 * "alterations" (jf. docs/data.md): feltudvalg, sprogvalg, validering
 * og normalisering — ingen sammenblanding med andre kilder.
 */

export interface OffLangText {
  lang: string;
  text: string;
}

export interface OffNutriment {
  name: string;
  "100g"?: number | null;
}

export interface OffImage {
  key: string;
  rev?: number | null;
}

export interface OffRow {
  code: string;
  lang?: string | null;
  product_name?: OffLangText[] | null;
  brands?: string | null;
  categories_tags?: string[] | null;
  nutriments?: OffNutriment[] | null;
  nova_group?: number | null;
  nutriscore_grade?: string | null;
  additives_tags?: string[] | null;
  ingredients_text?: OffLangText[] | null;
  allergens_tags?: string[] | null;
  images?: OffImage[] | null;
}

export interface FoodRow {
  source: "off";
  data_quality: "crowdsourced";
  source_ref: string;
  barcode: string;
  name: string;
  brand: string | null;
  categories: string[];
  nova_group: number | null;
  nutriscore: string | null;
  additives: string[];
  ingredients_text: string | null;
  allergens: string[];
  nutriments: Record<string, number>;
  image_url: string | null;
}

/** Sprogpræference: dansk → engelsk → produktets hovedsprog → første. */
export function pickLang(
  entries: OffLangText[] | null | undefined,
  mainLang: string | null | undefined,
): string | null {
  if (!entries || entries.length === 0) return null;
  const clean = entries.filter((e) => e.text && e.text.trim().length > 0);
  if (clean.length === 0) return null;
  const byLang = (lang: string) => clean.find((e) => e.lang === lang)?.text;
  return (
    byLang("da") ??
    byLang("en") ??
    (mainLang ? byLang(mainLang) : undefined) ??
    byLang("main") ??
    clean[0]!.text
  ).trim();
}

/** Udvalgte næringsfelter pr. 100 g (nøgleskema normaliseres videre i 1.2). */
const NUTRIMENT_KEYS = new Set([
  "energy-kcal",
  "proteins",
  "carbohydrates",
  "sugars",
  "fat",
  "saturated-fat",
  "fiber",
  "salt",
  "sodium",
]);

export function pickNutriments(
  nutriments: OffNutriment[] | null | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const n of nutriments ?? []) {
    if (!NUTRIMENT_KEYS.has(n.name)) continue;
    const value = n["100g"];
    if (typeof value === "number" && Number.isFinite(value)) {
      out[`${n.name}_100g`] = value;
    }
  }
  return out;
}

/** OFF's billedsti: 13-cifret kode deles 3/3/3/rest; korte koder bruges råt. */
export function imagePath(code: string): string {
  if (code.length <= 8) return code;
  return `${code.slice(0, 3)}/${code.slice(3, 6)}/${code.slice(6, 9)}/${code.slice(9)}`;
}

export function pickImageUrl(
  images: OffImage[] | null | undefined,
  code: string,
): string | null {
  if (!images || images.length === 0) return null;
  const prefs = ["front_da", "front_en", "front"];
  const front =
    images.find((i) => prefs.includes(i.key)) ??
    images.find((i) => i.key.startsWith("front_"));
  if (!front || front.rev == null) return null;
  return `https://images.openfoodfacts.org/images/products/${imagePath(code)}/${front.key}.${front.rev}.400.jpg`;
}

/** null = rækken springes over (mangler kode eller navn). */
export function transformOffRow(row: OffRow): FoodRow | null {
  const code = row.code?.trim();
  if (!code || !/^\d{4,14}$/.test(code)) return null;

  const name = pickLang(row.product_name, row.lang);
  if (!name) return null;

  const nova =
    row.nova_group != null && row.nova_group >= 1 && row.nova_group <= 4
      ? row.nova_group
      : null;

  const grade = row.nutriscore_grade?.toLowerCase() ?? null;
  const nutriscore = grade && ["a", "b", "c", "d", "e"].includes(grade) ? grade : null;

  return {
    source: "off",
    data_quality: "crowdsourced",
    source_ref: code,
    barcode: code,
    name: name.slice(0, 500),
    brand: row.brands?.trim().slice(0, 200) || null,
    categories: (row.categories_tags ?? []).slice(0, 50),
    nova_group: nova,
    nutriscore,
    additives: (row.additives_tags ?? []).slice(0, 100),
    ingredients_text: pickLang(row.ingredients_text, row.lang)?.slice(0, 5000) ?? null,
    allergens: (row.allergens_tags ?? []).slice(0, 50),
    nutriments: pickNutriments(row.nutriments),
    image_url: pickImageUrl(row.images, code),
  };
}
