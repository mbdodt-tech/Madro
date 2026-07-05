/**
 * Frida-ingestion (fase-tjekliste 1.2). DTU Fødevareinstituttet.
 *
 * Kilde: den officielle FCDB-eksport på DTU Data (figshare), DOI
 * 10.11583/DTU.32312844 — hentes programmatisk via figshare-API'et.
 * Regnearket har flere ark: `Data_Table` (bred: FoodID + parametre pr.
 * kolonne, med 3 metadata-rækker øverst) og `Food` (FoodID → navn).
 *
 *   pnpm ingest:frida
 *
 * Citation (docs/data.md): "Fødevaredata (fcdb.fooddata.dk / FCDB v6.1,
 * 2026), Fødevareinstituttet, DTU". `source='frida'`, `data_quality='verified'`.
 */

import { mapFridaColumns } from "@madro/core";
import { DuckDBInstance } from "@duckdb/node-api";
import "dotenv/config";
import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { connectIngest, upsertFoods, type FoodUpsert } from "./lib/upsert";

const FIGSHARE_ARTICLE = "32312844"; // The Danish Food Composition Database v6.1
const CACHE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".cache");
const FILE = path.join(CACHE_DIR, "frida.xlsx");
const CITATION = "Fødevaredata (FCDB v6.1, 2026), Fødevareinstituttet, DTU";

/** Første 3 rækker i Data_Table er metadata (EN-navne, enheder, id-linje). */
const META_ROWS = 3;

async function ensureFile(): Promise<void> {
  try {
    const info = await stat(FILE);
    if (info.size > 1_000_000) return;
  } catch {
    /* hent */
  }
  await mkdir(CACHE_DIR, { recursive: true });
  console.info("Henter FCDB-datasæt fra DTU Data (figshare)…");
  const meta = await fetch(
    `https://api.figshare.com/v2/articles/${FIGSHARE_ARTICLE}`,
  ).then((r) => r.json() as Promise<{ files: { name: string; download_url: string }[] }>);
  const xlsx = meta.files.find((f) => f.name.toLowerCase().endsWith(".xlsx"));
  if (!xlsx) throw new Error("Ingen .xlsx i datasættet");
  const res = await fetch(xlsx.download_url, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`Download fejlede: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(FILE));
  console.info(`Hentet ${xlsx.name}.`);
}

async function readSheet(
  con: Awaited<ReturnType<DuckDBInstance["connect"]>>,
  sheet: string,
): Promise<Record<string, unknown>[]> {
  const r = await con.runAndReadAll(
    `SELECT * FROM read_xlsx('${FILE.replace(/\\/g, "/")}', sheet='${sheet}', all_varchar=true)`,
  );
  return r.getRowObjects() as Record<string, unknown>[];
}

async function main(): Promise<void> {
  await ensureFile();

  const instance = await DuckDBInstance.create(":memory:");
  const con = await instance.connect();
  await con.run("INSTALL excel; LOAD excel;");

  // FoodID → dansk navn
  const foodSheet = await readSheet(con, "Food");
  const names = new Map<string, string>();
  for (const row of foodSheet) {
    const id = String(row["FoodID"] ?? "").trim();
    const name = String(row["FødevareNavn"] ?? "").trim();
    if (id && name) names.set(id, name);
  }
  console.info(`Food-ark: ${names.size} fødevarenavne.`);

  const dataTable = await readSheet(con, "Data_Table");
  const idCol = Object.keys(dataTable[0]!)[0]!; // første kolonne = FoodID
  const foods: FoodUpsert[] = [];
  const seen = new Set<string>();

  dataTable.slice(META_ROWS).forEach((row) => {
    const id = String(row[idCol] ?? "").trim();
    if (!id || seen.has(id)) return;
    const name = names.get(id);
    if (!name) return;
    seen.add(id);
    foods.push({
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
      nutriments: mapFridaColumns(row),
      image_url: null,
    });
  });

  console.info(`Transformeret: ${foods.length} fødevarer (citation: ${CITATION}).`);

  const client = connectIngest();
  await client.connect();
  try {
    await upsertFoods(client, foods);
    const { rows } = await client.query(
      "select count(*)::int as n from public.foods where source = 'frida'",
    );
    console.info(`Færdig: ${foods.length} Frida-rækker upsertet. foods(source=frida) i alt: ${rows[0].n}.`);
  } finally {
    await client.end();
  }
}

await main();
