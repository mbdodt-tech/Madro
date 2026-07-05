# Datakilder: ingestion, licenser og compliance

## OFF-ingestion: kørsel og kadence (trin 1.1)

**Kilde:** OFF's officielle Parquet-eksport på Hugging Face (`openfoodfacts/product-database`, food-splittet, ODbL) — læses remote via DuckDB med filter-pushdown, så kun valgte lande/kolonner hentes. Fallback: det natlige JSONL-dump (`static.openfoodfacts.org/data`) kan streames, hvis parquet-eksporten svigter.

**Kørsel:**

```
pnpm ingest:off                    # dansk udsnit (default)
pnpm ingest:off -- --nordic        # DK/SE/NO/FI/IS ← natlig kørsel bruger denne
pnpm ingest:off -- --full          # globalt load (stort — kun bevidst)
pnpm ingest:off -- --limit=50      # prøvekørsel
```

Kræver `scripts/.env` med `INGEST_DATABASE_URL` (se `.env.example`). Scriptet upserter på `(source='off', source_ref=stregkode)` og rører aldrig rækker fra andre kilder. Genkørsel er idempotent.

**Kadence:** GitHub Action `.github/workflows/ingest-off.yml` kører natligt (03:15 UTC, `--nordic`-scope) + manuelt via workflow_dispatch. **Aktiveres manuelt:** sæt repo-secret `INGEST_DATABASE_URL` og repo-variablen `INGEST_ENABLED=true`.

### Miss-fallback: `off-lookup` Edge Function (godkendt 2026-07-05)

Landefiltre giver blinde vinkler: internationale varer solgt i DK er ofte kun landetagget UK/DE/… i OFF (konkret eksempel: Monster-stregkode 5060751215042, kun `en:united-kingdom`). Derfor gælder reglen nu **cache-først + éngangs-fallback**:

1. Klienten slår altid op i vores egen `foods`-tabel først.
2. Kun ved miss kalder klienten Edge Functionen `off-lookup`, som server-side henter den ene vare fra OFF's API v2 (med `User-Agent` jf. OFF's API-regler), transformerer til det kanoniske skema og **skriver den ind i `foods`** (`source='off'`, `data_quality='crowdsourced'`). Næste scan af samme vare rammer cachen.
3. Klienten kalder aldrig OFF direkte, og cachede varer live-fetches aldrig.

Rate limit: 30 opslag/min pr. bruger (delt `ai_requests`-tabel, task `off_lookup`). ODbL: fallback-hentede rækker indgår i samme afledte OFF-database som dump-ingestionen — samme attribution og adskillelsesregler (én række pr. kilde; OFF-rækker merges aldrig med andre kilder).

**DB-adgang:** dedikeret Postgres-rolle `ingest` (kun `foods` + `nutrient_references`, via RLS-politikker — bevidst ikke service role). Oprettet i migration `…_ingest_role.sql` uden password. **Password sættes manuelt** (Supabase dashboard → SQL editor) — indsæt passwordet mellem de enkelte anførselstegn (ingen vinkelparenteser):

```sql
alter role ingest with password 'dit-password-her';
```

…og indsættes i `scripts/.env` (format i `.env.example`; pooler-brugernavn er `ingest.rtkktiywjcwglwzebchx`). Rotation: kør samme statement igen.

## Fælles nutrient-skema (trin 1.2)

Alle kilder normaliseres til ét kanonisk nøglesæt i `@madro/core` (`src/nutrients/`): 26 nøgler (makro + 17 mikronæringsstoffer), værdier pr. 100 g i nøglens enhed. Mappere pr. kilde: `map-off`, `map-usda`, `map-frida`. `foods.nutriments` bruger disse nøgler for alle kilder — OFF-udsnittet er genkørt efter omlægningen.

## USDA-ingestion (trin 1.2)

```
pnpm ingest:usda            # Foundation Foods + SR Legacy (~8.150 fødevarer)
```

Public domain. Zip-filer caches i `scripts/.cache/`. `source='usda'`, `data_quality='verified'`, `source_ref=fdcId`. Kredit i UI: "USDA FoodData Central".

## Frida-ingestion (trin 1.2)

```
pnpm ingest:frida           # ~1.390 fødevarer
```

Kilde: **den officielle FCDB-eksport på DTU Data** (figshare, DOI [10.11583/DTU.32312844](https://doi.org/10.11583/DTU.32312844), "The Danish Food Composition Database, version 6.1") — hentes programmatisk via figshare-API'et og caches i `scripts/.cache/frida.xlsx`. (Fridas SPA-API er antiforgery-låst og ikke tiltænkt masseudtræk; DOI-datasættet er den korrekte bulk-kilde.)

Regnearket har flere ark: `Data_Table` (bred — FoodID + parametre pr. kolonne, 3 metadata-rækker øverst) og `Food` (FoodID → navn). `map-frida` i `@madro/core` vælger én kolonne pr. kanonisk nøgle (analyseret værdi, ikke deklaration/kJ) — enhederne matcher allerede, verificeret mod `Parameter`-arket. `source='frida'`, `data_quality='verified'`, `source_ref=FoodID`.

**Citation** (UI + docs): *"Fødevaredata (FCDB v6.1, 2026), Fødevareinstituttet, DTU"*.

## Referencer: NNR2023 (trin 1.2)

```
pnpm ingest:references      # seed nutrient_references fra scripts/data/nnr2023.json
```

Kilde: **Nordiske Næringsstofanbefalinger 2023 (NNR2023)** — grundlaget for de danske kostråd. Køns- og aldersopdelte referenceintag (RI) + øvre grænser (UL), region 'DK'. Jern har menopause-split for kvinder (18-50: 15 mg, 51+: 9 mg).

> ⚠ **Værdierne i `scripts/data/nnr2023.json` skal granskes mod NNR2023-rapporten før launch** og udvides for øvrige aldersgrupper/graviditet. De nuværende tal er indtastet for voksne som fungerende udgangspunkt, ikke som endelig klinisk reference.

---


Research udført 2026-07-05 (Fase 1-forberedelse). Kørsel/kadence for ingestion tilføjes i trin 1.1/1.2. **Ikke juridisk rådgivning** — vurderingen bygger på licensteksterne og kildernes egne vilkår; endelig accept er produktejerens.

## Open Food Facts (OFF) — ODbL

**Licenser:** databasen er ODbL 1.0; indholdet DbCL; produktbilleder CC BY-SA 3.0. Kommerciel brug er udtrykkeligt tilladt, hvis vilkårene overholdes.

**Vurdering af vores arkitektur** (cached `foods`-tabel, natlig dump-ingestion):

1. **Vores OFF-udsnit er en "Derivative Database"** (ODbL §1: enhver oversættelse, tilpasning, udvælgelse eller ændring). Filtrering til DK/Norden + feltudvalg + nøgle-normalisering er alterations.
2. **App-skærme er "Produced Works"** (verdikt-ark, produktdetalje). Krav (§4.3): en synlig notits om at indholdet stammer fra Open Food Facts med licens + link. Er allerede med i designet ("Data: Open Food Facts").
3. **Share-alike trigges** (§4.4(c)): når Produced Works fra en derivative database bruges offentligt, skal selve den derivative database tilbydes under ODbL. Opfyldelse (§4.6): enten den fulde afledte database **eller** en fil med alle alterations/metoden. **Vores plan:** (a) offentlig "Om data"-side med attribution, licenshenvisning og en beskrivelse af transformationen (landefilter + feltliste + normalisering — reproducerbar fra det offentlige OFF-dump), og (b) OFF-udsnittet udleveres som dump på forespørgsel. Ingestion-scriptet holdes så transformationen er fuldt beskrevet af det.
4. **Share-alike smitter IKKE de andre kilder** (§4.5(a), "Collective Database"): USDA-, Frida- og custom-rækker er uafhængige databaser samlet i én tabel med `source`-kolonne som skillelinje. **Arkitekturregel:** en OFF-række må aldrig beriges in-place med USDA/Frida-værdier (og omvendt) — kombination sker ved opslag/visning (= Produced Work). Én række pr. (source, source_ref), som skemaet allerede håndhæver.
5. **Verdikt-scores** beregnes i `packages/core` ved runtime og persisteres ikke i `foods` — de er en del af Produced Work, ikke af databasen.
6. **Billeder:** OFF-billeder er CC BY-SA — kræver særskilt attribution, og deling af bearbejdede billeder skal ske under samme licens. Vi viser dem kun (med attribution).

**Konklusion: trin 1.1 er ikke blokeret.** Kravene er attribution i UI, "Om data"-side med transformationsbeskrivelse, dump-på-forespørgsel, og reglen om kildeadskilte rækker.

## Frida (DTU Fødevareinstituttet)

**Kilde:** fooddata.dk (siten er flyttet til fcdb.fooddata.dk, "Den Danske Fødevaredatabase"). Data er gratis tilgængelige, kan downloades og videreanvendes.

**Officielle vilkår fundet (2026-07-05):**
- Ansvarsfraskrivelsen (fcdb.fooddata.dk/disclaimer) indeholder **kun** en garanti-/ansvarsfraskrivelse og nævner neutralt "anvendelse i software" — **ingen kommerciel begrænsning**.
- Ældre officiel formulering: *"Data og tekster fra frida.fooddata.dk må ikke kopieres eller på anden måde gengives uden tydelig kildeangivelse"* — dvs. krav om **tydelig kildeangivelse ved enhver visning/brug**.
- Anbefalet citation: *"Fødevaredata (frida.fooddata.dk), version X, årstal, Fødevareinstituttet, Danmarks Tekniske Universitet"* (versionsnummer registreres ved ingestion).
- En påstået "no profit-making use"-klausul viste sig at stamme fra en tredjeparts-mirror (sur.ly) — den findes **ikke** i DTU's egne tekster.

**Konklusion: kommerciel brug med tydelig kildeangivelse vurderes tilladt** — DTU publicerer databasen til fri brug og fremhæver selv professionel anvendelse. **Anbefalet forsigtighedstrin (ikke-blokerende):** send en kort bekræftelsesmail til fvdb@food.dtu.dk ("vi bruger Fødevaredata med citation i en kommerciel ernæringsapp — bekræft venligst at det er ok"), da siten ikke bærer en formel licens (fx CC). Trin 1.2 kan bygges imens; svaret arkiveres her.

**UI-krav:** Frida-baserede visninger krediterer "Fødevaredata (frida.fooddata.dk), DTU Fødevareinstituttet" — kildebadge findes allerede i designet (`data_quality`/`source` vises transparent).

## USDA FoodData Central

Amerikansk forbundsdata: **public domain** (ingen licensbegrænsning, heller ikke kommercielt). USDA beder om kildeangivelse som god praksis — vi krediterer "USDA FoodData Central" i kildebadgen. Ingen blokeringer.

## Samlet UI-attribution (implementeres i Fase 1)

- Kildebadge pr. fødevare (allerede i designet): OFF / USDA / Frida / egen.
- "Om data"-side (nås fra Profil → indstillinger): de tre attributioner med links + ODbL-notits + transformationsbeskrivelse + kontakt for dump af OFF-udsnittet.
