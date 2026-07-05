import pg from "pg";

/** Én kanonisk foods-række, klar til upsert (kilde-agnostisk). */
export interface FoodUpsert {
  source: "off" | "usda" | "frida" | "custom";
  data_quality: "verified" | "crowdsourced" | "user";
  source_ref: string;
  barcode: string | null;
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

const COLS = [
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

const BATCH_SIZE = 500;

/**
 * Batch-upsert på (source, source_ref). Rører ALDRIG rækker fra andre
 * kilder — ON CONFLICT-nøglen er kilde-specifik (ODbL-adskillelsesreglen).
 */
export async function upsertFoods(
  client: pg.Client,
  rows: FoodUpsert[],
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values: unknown[] = [];
    const placeholders = batch
      .map((row, r) => {
        const offset = r * COLS.length;
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
        return `(${COLS.map((_, c) => `$${offset + c + 1}`).join(",")})`;
      })
      .join(",");

    await client.query(
      `insert into public.foods (${COLS.join(",")})
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
}

export function connectIngest(): pg.Client {
  const url = process.env.INGEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "INGEST_DATABASE_URL mangler — kopiér scripts/.env.example til scripts/.env (se docs/data.md).",
    );
  }
  return new pg.Client({ connectionString: url });
}
