/**
 * OFF-ingestion (fase-tjekliste 1.1).
 *
 * Kilde: Open Food Facts' officielle Parquet-eksport på Hugging Face
 * (ODbL) — læses remote via DuckDB med filter-pushdown, så kun de
 * valgte lande og kolonner hentes.
 *
 * Kørsel:
 *   pnpm ingest:off                          # dansk udsnit (default)
 *   pnpm ingest:off -- --nordic              # DK/SE/NO/FI/IS
 *   pnpm ingest:off -- --countries=en:germany,en:france
 *   pnpm ingest:off -- --full                # globalt load (stort!)
 *   pnpm ingest:off -- --limit=50            # prøvekørsel
 *
 * Kræver INGEST_DATABASE_URL i scripts/.env (ingest-rollen — se
 * docs/data.md). Logger kun counts — aldrig produktdata.
 */

import { DuckDBInstance } from "@duckdb/node-api";
import "dotenv/config";
import pg from "pg";
import { transformOffRow, type FoodRow, type OffRow } from "./off/transform";

const PARQUET = "hf://datasets/openfoodfacts/product-database/food.parquet";
const NORDIC = ["en:denmark", "en:sweden", "en:norway", "en:finland", "en:iceland"];
const BATCH_SIZE = 500;

interface Options {
  countries: string[] | null; // null = fuldt globalt load
  limit: number | null;
}

function parseArgs(argv: string[]): Options {
  let countries: string[] | null = ["en:denmark"];
  let limit: number | null = null;
  for (const arg of argv) {
    if (arg === "--nordic") countries = NORDIC;
    else if (arg === "--full") countries = null;
    else if (arg.startsWith("--countries=")) {
      countries = arg
        .slice("--countries=".length)
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    } else if (arg.startsWith("--limit=")) {
      limit = Number(arg.slice("--limit=".length)) || null;
    }
  }
  return { countries, limit };
}

async function readOffRows(options: Options): Promise<OffRow[]> {
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  await connection.run("INSTALL httpfs; LOAD httpfs;");

  const where = options.countries
    ? `WHERE list_has_any(countries_tags, [${options.countries
        .map((c) => `'${c.replace(/'/g, "")}'`)
        .join(", ")}])`
    : "";
  const limit = options.limit ? `LIMIT ${options.limit}` : "";

  // Nested kolonner serialiseres til JSON i SQL, så JS-siden er simpel.
  const sql = `
    SELECT
      code,
      lang,
      to_json(product_name)     AS product_name,
      brands,
      to_json(categories_tags)  AS categories_tags,
      to_json(nutriments)       AS nutriments,
      nova_group,
      nutriscore_grade,
      to_json(additives_tags)   AS additives_tags,
      to_json(ingredients_text) AS ingredients_text,
      to_json(allergens_tags)   AS allergens_tags,
      to_json(images)           AS images
    FROM '${PARQUET}'
    ${where}
    ${limit}
  `;

  console.info(
    `Henter fra OFF-parquet (${options.countries ? options.countries.join(",") : "GLOBALT"})…`,
  );
  const result = await connection.runAndReadAll(sql);
  const rows = result.getRowObjects();

  const parse = <T>(v: unknown): T | null =>
    typeof v === "string" ? (JSON.parse(v) as T) : null;

  return rows.map((r) => ({
    code: String(r.code ?? ""),
    lang: r.lang == null ? null : String(r.lang),
    product_name: parse<OffRow["product_name"]>(r.product_name),
    brands: r.brands == null ? null : String(r.brands),
    categories_tags: parse<string[]>(r.categories_tags),
    nutriments: parse<OffRow["nutriments"]>(r.nutriments),
    nova_group: r.nova_group == null ? null : Number(r.nova_group),
    nutriscore_grade:
      r.nutriscore_grade == null ? null : String(r.nutriscore_grade),
    additives_tags: parse<string[]>(r.additives_tags),
    ingredients_text: parse<OffRow["ingredients_text"]>(r.ingredients_text),
    allergens_tags: parse<string[]>(r.allergens_tags),
    images: parse<OffRow["images"]>(r.images),
  }));
}

async function upsertBatch(client: pg.Client, batch: FoodRow[]): Promise<void> {
  const cols = [
    "source",
    "data_quality",
    "source_ref",
    "barcode",
    "name",
    "brand",
    "categories",
    "nova_group",
    "nutriscore",
    "additives",
    "ingredients_text",
    "allergens",
    "nutriments",
    "image_url",
  ];
  const values: unknown[] = [];
  const placeholders = batch
    .map((row, i) => {
      const offset = i * cols.length;
      values.push(
        row.source,
        row.data_quality,
        row.source_ref,
        row.barcode,
        row.name,
        row.brand,
        row.categories,
        row.nova_group,
        row.nutriscore,
        row.additives,
        row.ingredients_text,
        row.allergens,
        JSON.stringify(row.nutriments),
        row.image_url,
      );
      return `(${cols.map((_, j) => `$${offset + j + 1}`).join(",")})`;
    })
    .join(",");

  await client.query(
    `insert into public.foods (${cols.join(",")})
     values ${placeholders}
     on conflict (source, source_ref) where source_ref is not null
     do update set
       barcode = excluded.barcode,
       name = excluded.name,
       brand = excluded.brand,
       categories = excluded.categories,
       nova_group = excluded.nova_group,
       nutriscore = excluded.nutriscore,
       additives = excluded.additives,
       ingredients_text = excluded.ingredients_text,
       allergens = excluded.allergens,
       nutriments = excluded.nutriments,
       image_url = excluded.image_url,
       updated_at = now()`,
    values,
  );
}

async function main(): Promise<void> {
  const url = process.env.INGEST_DATABASE_URL;
  if (!url) {
    console.error(
      "INGEST_DATABASE_URL mangler — kopiér scripts/.env.example til scripts/.env (se docs/data.md).",
    );
    process.exit(1);
  }

  const options = parseArgs(process.argv.slice(2));
  const started = Date.now();

  const offRows = await readOffRows(options);
  console.info(`Hentet ${offRows.length} rå rækker.`);

  const foods: FoodRow[] = [];
  const seen = new Set<string>();
  for (const raw of offRows) {
    const row = transformOffRow(raw);
    if (row && !seen.has(row.source_ref)) {
      seen.add(row.source_ref);
      foods.push(row);
    }
  }
  console.info(
    `Transformeret: ${foods.length} gyldige (${offRows.length - foods.length} sprunget over).`,
  );

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    for (let i = 0; i < foods.length; i += BATCH_SIZE) {
      await upsertBatch(client, foods.slice(i, i + BATCH_SIZE));
      if ((i / BATCH_SIZE) % 20 === 0) {
        console.info(`Upsertet ${Math.min(i + BATCH_SIZE, foods.length)}/${foods.length}…`);
      }
    }
    const { rows } = await client.query(
      "select count(*)::int as n from public.foods where source = 'off'",
    );
    console.info(
      `Færdig: ${foods.length} rækker upsertet på ${Math.round((Date.now() - started) / 1000)}s. foods(source=off) i alt: ${rows[0].n}.`,
    );
  } finally {
    await client.end();
  }
}

await main();
