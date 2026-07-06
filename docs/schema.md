# Databaseskema

Kilde: `supabase/migrations/20260704072000_core_schema.sql`, anvendt på Supabase-projektet **Madro** (`rtkktiywjcwglwzebchx`, eu-central-1) 2026-07-04. TypeScript-typer genereres til `packages/core/src/database.types.ts` efter hver migration.

## Tabeller

| Tabel | Formål | RLS |
|---|---|---|
| `profiles` | Én række pr. bruger (PK = `auth.users.id`): locale, `hide_calories`, køn/fødselsår/aktivitetsniveau (RDA-profil), `height_cm`/`weight_kg` (fase 3.1, frivillige — grundlag for Mifflin-St Jeor i core; DB-checks 100-250 cm / 30-300 kg), mål (`goals.direction`: maintain/gentle_deficit/gentle_surplus), kostpræferencer, `rda_region`, `entitlement` (RevenueCat-spejl) | select/insert/update egen række; ingen delete (kontosletning = Fase 4-flow via cascade) |
| `foods` | Fælles fødevaretabel på tværs af kilder: `source` (off/usda/frida/custom), `data_quality` (verified/crowdsourced/user), stregkode, NOVA, Nutri-Score, additiver, `nutriments` (jsonb, normaliseret nøgleskema fra Fase 1.2), `owner_id` for custom-fødevarer | læs: alle indloggede; skriv: kun egne `custom`-rækker — ingestion kører via service role |
| `scans` | Scanhændelser: type (barcode/photo), `outcome` (checked/logged), payload. Foto-scans gemmer ved log `{ai_items, final_items}` (kun navne/gram — aldrig billeder; fase 3.4): de seneste ≤20 par aggregeres klient-side til kalibrerings-hints for parse_photo_meal | alle operationer egen bruger |
| `log_entries` | Dagbogsposter: fødevare, mængde/enhed, måltid (breakfast/lunch/dinner/snack), `consumed_at`, evt. ophavs-scan | alle operationer egen bruger |
| `daily_summaries` | PK `(user_id, day)`: kcal, makro-/mikro-rollups (jsonb), NOVA-andel. **Genberegnes af AFTER-trigger på `log_entries`** (`recompute_daily_summary`, fase 1.7): fuld gen-aggregering af den berørte dag ved insert/update/delete; flyt over dagsgrænse genberegner begge dage; 0 poster sletter rækken. Dagsgrænsen følger `profiles.timezone` (default `Europe/Copenhagen`). Formlerne spejler `@madro/core` (sumNutrients/novaShare) — verificeret mod core-fixtures (556 kcal/87,32 %). Målt ved 150 poster: summary-opslag 0,12 ms vs. rå aggregering 1,67 ms | alle operationer egen bruger |
| `insights` | AI-indsigter pr. periode (Fase 2) | select/insert/delete egen bruger (skrives normalt af service role) |
| `recommendations` | "Bedre alternativ"-forslag pr. scan/dag (Fase 2) | select/insert/delete egen bruger |
| `nutrient_references` | RDA/NRV pr. næringsstof × region (DK/EU/US) × køn × aldersinterval — udfyldes i Fase 1.2 | read-only for authenticated; skriv kun service role |
| `body_metrics` | Vægt pr. dag (PK `(user_id, day)`, 30-300 kg-check); `source` = provider-nøgle ('manual' nu, 'healthkit' m.fl. i Fase 5). Spejles til `profiles.weight_kg` ved log (fase 3.2) | alle operationer egen bruger (RLS-bevis kørt 2026-07-06: fremmed læsning 0 rækker, fremmed skrivning 42501) |
| `activity_days` | Skridt + aktiv energi pr. dag (PK `(user_id, day)`); aktiv-kcal lægges neutralt oven i dagens energireference på "I dag" | alle operationer egen bruger (samme RLS-bevis) |

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
