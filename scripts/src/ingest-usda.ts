/**
 * USDA FoodData Central-ingestion (fase-tjekliste 1.2).
 * Foundation Foods + SR Legacy (public domain). Kanoniske
 * nutrient-nøgler via @madro/core.
 *
 *   pnpm ingest:usda            # begge sæt
 *   pnpm ingest:usda -- --limit=100
 */

import { mapUsdaNutrients, type UsdaFoodNutrient } from "@madro/core";
import "dotenv/config";
import { unzipSync } from "fflate";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { connectIngest, upsertFoods, type FoodUpsert } from "./lib/upsert";

const CACHE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".cache");

const SOURCES = [
  {
    label: "Foundation",
    url: "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2026-04-30.zip",
    zip: "usda-foundation.zip",
    topKey: "FoundationFoods",
  },
  {
    label: "SR Legacy",
    url: "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip",
    zip: "usda-sr-legacy.zip",
    topKey: "SRLegacyFoods",
  },
];

interface UsdaFood {
  fdcId: number;
  description: string;
  foodNutrients?: UsdaFoodNutrient[];
  foodCategory?: { description?: string } | null;
}

async function ensureZip(url: string, name: string): Promise<string> {
  const target = path.join(CACHE_DIR, name);
  try {
    const info = await stat(target);
    if (info.size > 10_000) return target;
  } catch {
    /* hent */
  }
  await mkdir(CACHE_DIR, { recursive: true });
  console.info(`Downloader ${name}…`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`Download fejlede: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(target));
  return target;
}

/** Udpak den (ene) JSON-fil i zip'en (pure-JS, cross-platform). */
async function readZippedJson(zipPath: string): Promise<Buffer> {
  const buf = await readFile(zipPath);
  const entries = unzipSync(new Uint8Array(buf));
  const jsonName = Object.keys(entries).find((n) => n.endsWith(".json"));
  if (!jsonName) throw new Error("Ingen JSON-fil i zip");
  return Buffer.from(entries[jsonName]!);
}

function transformUsda(food: UsdaFood): FoodUpsert | null {
  if (!food.fdcId || !food.description) return null;
  return {
    source: "usda",
    data_quality: "verified",
    source_ref: String(food.fdcId),
    barcode: null,
    name: food.description.slice(0, 500),
    brand: null,
    categories: food.foodCategory?.description
      ? [food.foodCategory.description]
      : [],
    nova_group: null,
    nutriscore: null,
    additives: [],
    ingredients_text: null,
    allergens: [],
    nutriments: mapUsdaNutrients(food.foodNutrients ?? []),
    image_url: null,
  };
}

async function main(): Promise<void> {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : null;

  const client = connectIngest();
  await client.connect();
  let total = 0;
  try {
    for (const src of SOURCES) {
      const zip = await ensureZip(src.url, src.zip);
      console.info(`Udpakker ${src.label}…`);
      const json = await readZippedJson(zip);
      const parsed = JSON.parse(json.toString("utf-8")) as Record<string, UsdaFood[]>;
      const foods = parsed[src.topKey] ?? [];
      const rows: FoodUpsert[] = [];
      const seen = new Set<string>();
      for (const f of foods) {
        if (!f) continue;
        const row = transformUsda(f);
        if (row && !seen.has(row.source_ref)) {
          seen.add(row.source_ref);
          rows.push(row);
        }
        if (limit && rows.length >= limit) break;
      }
      console.info(`${src.label}: ${rows.length} fødevarer → upsert…`);
      await upsertFoods(client, rows);
      total += rows.length;
    }
    const { rows } = await client.query(
      "select count(*)::int as n from public.foods where source = 'usda'",
    );
    console.info(`Færdig: ${total} USDA-rækker upsertet. foods(source=usda) i alt: ${rows[0].n}.`);
  } finally {
    await client.end();
  }
}

await main();
