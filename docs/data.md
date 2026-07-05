# Datakilder: licenser og compliance

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
