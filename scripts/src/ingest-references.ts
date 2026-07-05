/**
 * Seed nutrient_references fra det kuraterede NNR2023-datasæt
 * (fase-tjekliste 1.2). Idempotent upsert på den unikke nøgle
 * (nutrient_key, region, sex, age_min).
 *
 *   pnpm ingest:references
 *
 * ⚠ Værdierne i scripts/data/nnr2023.json skal granskes mod NNR2023-
 * rapporten før launch (se docs/data.md).
 */

import { isNutrientKey } from "@madro/core";
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectIngest } from "./lib/upsert";

interface RefRow {
  nutrient_key: string;
  sex: string;
  age_min: number;
  age_max: number;
  rda: number | null;
  ul: number | null;
  unit: string;
}

const DATA = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "nnr2023.json",
);

async function main(): Promise<void> {
  const raw = JSON.parse(await readFile(DATA, "utf-8")) as {
    _meta: { region: string; source: string };
    references: RefRow[];
  };
  const region = raw._meta.region;
  const source = raw._meta.source;

  for (const r of raw.references) {
    if (!isNutrientKey(r.nutrient_key)) {
      throw new Error(`Ukendt nutrient_key i seed: ${r.nutrient_key}`);
    }
  }

  const client = connectIngest();
  await client.connect();
  try {
    let n = 0;
    for (const r of raw.references) {
      await client.query(
        `insert into public.nutrient_references
           (nutrient_key, unit, region, sex, age_min, age_max, rda, ul, source)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (nutrient_key, region, sex, age_min) do update set
           unit = excluded.unit, age_max = excluded.age_max,
           rda = excluded.rda, ul = excluded.ul, source = excluded.source`,
        [r.nutrient_key, r.unit, region, r.sex, r.age_min, r.age_max, r.rda, r.ul, source],
      );
      n++;
    }
    const { rows } = await client.query(
      "select count(*)::int as c from public.nutrient_references",
    );
    console.info(`Seedet ${n} referencer. nutrient_references i alt: ${rows[0].c}.`);
  } finally {
    await client.end();
  }
}

await main();
