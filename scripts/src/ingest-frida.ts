/**
 * Frida-ingestion (fase-tjekliste 1.2). DTU Fødevareinstituttet.
 *
 * Fridas bulk-eksport hentes MANUELT som regneark via formularen på
 * https://frida.fooddata.dk/data (link sendes på mail — DTU's egen
 * bulk-adgang; API'et er antiforgery-låst og ikke tiltænkt masseudtræk).
 * Læg filen som scripts/.cache/frida.xlsx og kør:
 *
 *   pnpm ingest:frida
 *
 * ⚠ Fridas kolonneopsætning bekræftes mod den faktiske fil ved første
 * kørsel (header-rækken inspiceres og logges). map-frida i @madro/core
 * matcher på EuroFIR-kode med dansk navn som fallback.
 *
 * Citation registreres pr. docs/data.md:
 *   "Fødevaredata (frida.fooddata.dk), version X, år, Fødevareinstituttet, DTU"
 */

import { mapFridaParameters, type FridaParameter } from "@madro/core";
import { DuckDBInstance } from "@duckdb/node-api";
import "dotenv/config";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectIngest, upsertFoods, type FoodUpsert } from "./lib/upsert";

const FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".cache",
  "frida.xlsx",
);

// Kolonner der IKKE er næringsparametre (id/navn); resten mappes via map-frida.
const ID_COLS = /^(f(ø|oe)devare\s*id|food\s*id|id)$/i;
const NAME_COLS = /^(f(ø|oe)devarenavn|food\s*name|navn|name)$/i;

async function loadRows(): Promise<Record<string, unknown>[]> {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  await connection.run("INSTALL excel; LOAD excel;");
  const result = await connection.runAndReadAll(
    `SELECT * FROM read_xlsx('${FILE.replace(/\\/g, "/")}', all_varchar = true)`,
  );
  return result.getRowObjects() as Record<string, unknown>[];
}

function transformFrida(
  row: Record<string, unknown>,
  columns: string[],
): FoodUpsert | null {
  const idCol = columns.find((c) => ID_COLS.test(c.trim()));
  const nameCol = columns.find((c) => NAME_COLS.test(c.trim()));
  if (!idCol || !nameCol) return null;

  const id = String(row[idCol] ?? "").trim();
  const name = String(row[nameCol] ?? "").trim();
  if (!id || !name) return null;

  const params: FridaParameter[] = [];
  for (const col of columns) {
    if (col === idCol || col === nameCol) continue;
    const raw = row[col];
    if (raw == null || raw === "") continue;
    // Frida bruger komma som decimaltegn i regnearket.
    const value = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(value)) continue;
    // Kolonnenavnet bærer det danske parameternavn; EuroFIR-koden kan
    // stå i parentes (fx "Jern (FE)") — udtræk hvis til stede.
    const eurofir = col.match(/\(([A-Z0-9]+)\)\s*$/)?.[1] ?? null;
    const nameDa = col.replace(/\s*\([A-Z0-9]+\)\s*$/, "").trim();
    params.push({ eurofir, nameDa, value });
  }

  return {
    source: "frida",
    data_quality: "verified",
    source_ref: id,
    barcode: null,
    name: name.slice(0, 500),
    brand: null,
    categories: [],
    nova_group: null,
    nutriscore: null,
    additives: [],
    ingredients_text: null,
    allergens: [],
    nutriments: mapFridaParameters(params),
    image_url: null,
  };
}

async function main(): Promise<void> {
  try {
    await access(FILE);
  } catch {
    console.error(
      `Frida-datafil mangler: ${FILE}\n` +
        "Hent regnearket via formularen på https://frida.fooddata.dk/data " +
        "(link sendes på mail) og læg det som scripts/.cache/frida.xlsx. Se docs/data.md.",
    );
    process.exit(1);
  }

  const rows = await loadRows();
  if (rows.length === 0) {
    console.error("Ingen rækker i Frida-filen.");
    process.exit(1);
  }
  const columns = Object.keys(rows[0]!);
  console.info(`Frida-fil læst: ${rows.length} rækker, ${columns.length} kolonner.`);
  console.info(`Header (til verifikation): ${columns.slice(0, 12).join(" | ")}…`);

  const foods: FoodUpsert[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const food = transformFrida(row, columns);
    if (food && !seen.has(food.source_ref)) {
      seen.add(food.source_ref);
      foods.push(food);
    }
  }
  console.info(`Transformeret: ${foods.length} fødevarer.`);

  const client = connectIngest();
  await client.connect();
  try {
    await upsertFoods(client, foods);
    const { rows: c } = await client.query(
      "select count(*)::int as n from public.foods where source = 'frida'",
    );
    console.info(`Færdig: ${foods.length} Frida-rækker upsertet. foods(source=frida) i alt: ${c[0].n}.`);
  } finally {
    await client.end();
  }
}

await main();
