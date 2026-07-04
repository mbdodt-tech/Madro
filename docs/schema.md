# Databaseskema

Kilde: `supabase/migrations/20260704072000_core_schema.sql`, anvendt på Supabase-projektet **Madro** (`rtkktiywjcwglwzebchx`, eu-central-1) 2026-07-04. TypeScript-typer genereres til `packages/core/src/database.types.ts` efter hver migration.

## Tabeller

| Tabel | Formål | RLS |
|---|---|---|
| `profiles` | Én række pr. bruger (PK = `auth.users.id`): locale, `hide_calories`, køn/fødselsår/aktivitetsniveau (RDA-profil), mål, kostpræferencer, `rda_region`, `entitlement` (RevenueCat-spejl) | select/insert/update egen række; ingen delete (kontosletning = Fase 4-flow via cascade) |
| `foods` | Fælles fødevaretabel på tværs af kilder: `source` (off/usda/frida/custom), `data_quality` (verified/crowdsourced/user), stregkode, NOVA, Nutri-Score, additiver, `nutriments` (jsonb, normaliseret nøgleskema fra Fase 1.2), `owner_id` for custom-fødevarer | læs: alle indloggede; skriv: kun egne `custom`-rækker — ingestion kører via service role |
| `scans` | Scanhændelser: type (barcode/photo), `outcome` (checked/logged), payload | alle operationer egen bruger |
| `log_entries` | Dagbogsposter: fødevare, mængde/enhed, måltid (breakfast/lunch/dinner/snack), `consumed_at`, evt. ophavs-scan | alle operationer egen bruger |
| `daily_summaries` | PK `(user_id, day)`: kcal, makro-/mikro-rollups (jsonb), NOVA-andel — genberegnes i Fase 1.7 | alle operationer egen bruger |
| `insights` | AI-indsigter pr. periode (Fase 2) | select/insert/delete egen bruger (skrives normalt af service role) |
| `recommendations` | "Bedre alternativ"-forslag pr. scan/dag (Fase 2) | select/insert/delete egen bruger |
| `nutrient_references` | RDA/NRV pr. næringsstof × region (DK/EU/US) × køn × aldersinterval — udfyldes i Fase 1.2 | read-only for authenticated; skriv kun service role |

Indekser: `foods(barcode)`, unik `foods(source, source_ref)`, trigram-GIN på `foods(name)` (tekstsøgning, Fase 1.5), `scans(user_id, created_at desc)`, `log_entries(user_id, consumed_at desc)`.

`updated_at` vedligeholdes af trigger (`set_updated_at()`) på `profiles`, `foods` og `log_entries`.

## Storage

| Bucket | Synlighed | Adgang |
|---|---|---|
| `meal-photos` | **privat** | RLS på `storage.objects`: brugeren kan kun læse/skrive filer i sin egen mappe (`<auth.uid()>/…`); visning i appen via signerede URL'er |
| `product-images` | offentlig | læsning via bucket-flag; skrivning kun service role |

Buckets oprettes i migrationen — koden må aldrig antage, at de findes.

## RLS-bevis (acceptkriterium, kørt 2026-07-04)

To testbrugere (A, B) med hver én `log_entries`-række, indsat som `postgres`:

```sql
select set_config('request.jwt.claims',
  '{"sub":"<A>","role":"authenticated"}', false);
set role authenticated;
select count(*), count(*) filter (where user_id = '<B>') from log_entries;
```

Resultat som bruger A: `rows_visible_as_a = 1`, `b_rows_visible_as_a = 0`, `auth_uid = <A>`.

Skrivetest: `insert … values ('<B>', …)` som bruger A fejlede med
`42501: new row violates row-level security policy for table "log_entries"`.

Supabase security advisor: **0 fund** efter migrationen. Testdata er ryddet op.

## Kendte til-senere

- `nutrient_references` og `foods` fyldes af ingestion-scripts i Fase 1 (service role).
- Profiloprettelse ved første login implementeres i Fase 0.5 (klientflow, ikke DB-trigger).
- Kontosletning + dataeksport (GDPR) er kernefunktioner i Fase 4.
