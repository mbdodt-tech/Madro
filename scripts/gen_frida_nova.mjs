/**
 * Genererer backfill-migrationen for DESIGN-1: sætter foods.nova_group for
 * Frida-rækker ud fra deres DTU-fødevaregruppe. Klassifikationen (gruppe →
 * NOVA) bor i @madro/core (fridaNovaGroup); denne generator anvender den blot
 * mekanisk på Frida-eksporten, så migrationens tal ikke kan drive fra koden.
 *
 * Kør: node gen_frida_nova.mjs        (rapport + skriver .sql)
 */
import { fridaNovaGroup } from "@madro/core";
import { DuckDBInstance } from "@duckdb/node-api";
import { writeFileSync } from "node:fs";

const FILE = "C:/Gits/Repos/Madro/scripts/.cache/frida.xlsx";
const OUT =
  "C:/Gits/Repos/Madro/supabase/migrations/20260721091500_frida_nova_backfill.sql";

const inst = await DuckDBInstance.create(":memory:");
const con = await inst.connect();
await con.run("INSTALL excel; LOAD excel;");
const r = await con.runAndReadAll(
  `SELECT "FoodID" AS id, "FoodGroupID" AS gid, "FoodGroup" AS grp FROM read_xlsx('${FILE}', sheet='Food', all_varchar=true)`,
);
const rows = r.getRowObjects();
await con.disconnectSync();

const pairs = [];
const dist = { 1: 0, 2: 0, 3: 0, 4: 0, null: 0 };
for (const row of rows) {
  const nova = fridaNovaGroup(row.gid);
  if (nova == null) {
    dist.null++;
    continue;
  }
  dist[nova]++;
  pairs.push([Number(row.id), nova]);
}

console.log("FoodID→NOVA fordeling:", dist);
console.log(`Par til backfill (nova ikke-null): ${pairs.length} / ${rows.length}`);

const sql = `-- DESIGN-1 (audit 2026-07-20): Frida-varer tæller ikke i kvalitetsmåleren,
-- fordi Frida-rækker manglede nova_group. DTU FCDB bærer en fødevaregruppe
-- pr. vare; vi mapper gruppen til NOVA 1-4 (se fridaNovaGroup i @madro/core).
-- Ægte whole foods (havregryn, frugt, kød, fisk) får nu NOVA 1 og indgår i
-- buen; ultraforarbejdede Frida-varer (slik, chips, fastfood) får korrekt
-- NOVA 4, så måleren ikke lyver den anden vej. Genuint blandede grupper
-- (naturel vs. frugtyoghurt) lades NULL og bliver ude af buen.
--
-- Genereret mekanisk fra .cache/frida.xlsx af scripts/gen_frida_nova.mjs —
-- redigér klassifikationen i @madro/core, ikke tallene her.

do $$
begin
  create temporary table _frida_nova (source_ref text primary key, nova smallint) on commit drop;

  insert into _frida_nova (source_ref, nova) values
  ${pairs.map(([id, nova]) => `('${id}',${nova})`).join(",\n  ")};

  update public.foods f
     set nova_group = n.nova
    from _frida_nova n
   where f.source = 'frida'
     and f.source_ref = n.source_ref
     and f.nova_group is distinct from n.nova;
end $$;
`;

writeFileSync(OUT, sql);
console.log(`Skrev migration: ${OUT} (${(sql.length / 1024).toFixed(1)} KiB)`);
