# Fase 0-1 tjekliste — prompts til Claude Code

*Gem denne fil som `docs/fase-tjekliste.md` i dit repo (sammen med `CLAUDE.md` i roden og byggeplanen som `docs/byggeplan.md`).*

**Sådan bruger du den:** Tag ét trin ad gangen. Start Claude Code i **Plan mode**, indsæt promptet, læs planen igennem, kommentér/justér, godkend — og commit, når trinnet er grønt. Kør `pnpm lint && pnpm typecheck && pnpm test` før hvert commit. Spring ikke trin over: rækkefølgen er bygget, så intet skal laves om senere.

Hvert trin har **acceptkriterier** — trinnet er først færdigt, når de alle er opfyldt.

---

## FASE 0 — Fundament

### 0.1 Monorepo-skelet

> Opret monorepo-strukturen beskrevet i CLAUDE.md: pnpm workspaces med `app/` (Vite + React 18 + TypeScript strict), `packages/ui`, `packages/core`, `supabase/`, `scripts/` og `docs/`. Opsæt ESLint + Prettier + Vitest på tværs af workspaces, med root-scripts `dev`, `build`, `test`, `lint`, `typecheck`. Tilføj `.gitignore` og en kort `README.md`. Opret ingen features endnu — kun skelettet, og en "hello world"-side i `app/`, der importerer en dummy-funktion fra `packages/core` og en dummy-komponent fra `packages/ui`, så workspace-linkingen er bevist.

**Accept:** `pnpm dev` viser siden; `pnpm lint`, `pnpm typecheck` og `pnpm test` kører grønt; import på tværs af packages virker.

### 0.2 Designtokens og Tailwind-tema

> Implementér designsystemets fundament i `packages/ui` ud fra `docs/byggeplan.md` afsnit 3: alle farver (lys + mørk, inkl. verdikt-skalaen), radius-skala, 4-pt spacing og typografiskala som Tailwind-tema/CSS-variabler. Indlæs Geist Sans og Geist Mono (self-host via fontsource eller lokale filer — ingen runtime-CDN-afhængighed), med `tabular-nums` som standard for mono. Opsæt mørk tilstand via `class`-strategi med en `ThemeProvider` (system/lys/mørk). Byg en midlertidig `/design`-side i appen, der viser hele paletten, typeskalaen og begge tilstande side om side.

**Accept:** `/design`-siden matcher byggeplanens afsnit 3 i begge tilstande; ingen hex-værdier i komponentkode; tema kan skiftes live.

### 0.3 Kernekomponenter

> Byg første bølge af komponenter i `packages/ui` oven på tokens: Button (primær/sekundær/ghost), Card, Sheet (bund-ark med spring-animation), Badge/Chip (inkl. VerdiktBadge med de fem niveauer), Input, PortionsStepper, Tabs, Toast, Skeleton, AppShell med BottomTabBar og central hævet ScanFAB. Al bevægelse via Framer Motion med spring-præsetet fra CLAUDE.md; respekter `prefers-reduced-motion`. Radix-primitiver som grundlag, hvor det er relevant. Udvid `/design`-siden med et komponentgalleri i begge tilstande.

**Accept:** alle komponenter fungerer med tastatur og skærmlæser; galleri ser rigtigt ud i lys og mørk; ingen hardcodede strenge (brug i18n-nøgler, jf. 0.5).

### 0.4 Supabase-projekt, skema og RLS

> Initialisér Supabase i `supabase/` og skriv første migration med kerneskemaet fra `docs/byggeplan.md` afsnit 5.2: `profiles`, `foods`, `log_entries`, `scans`, `daily_summaries`, `insights`, `recommendations` samt `nutrient_references`. RLS aktiveres på alle tabeller i samme migration: brugertabeller låst til `auth.uid()`, referencetabeller read-only for authenticated. Opret storage-buckets i seed/migration: `meal-photos` (privat, signerede URL'er) og `product-images` (offentlig). Generér TypeScript-typer til `packages/core`. Dokumentér skemaet kort i `docs/schema.md`.

**Accept:** migrationer kører rent på et frisk projekt; en test beviser, at bruger A ikke kan læse bruger B's rækker; buckets eksisterer efter seed; typer importeres i `packages/core`.

### 0.5 Auth og i18n-stillads

> Implementér Supabase Auth i appen (e-mail + magic link som minimum) med sessionshåndtering via TanStack Query, beskyttede ruter og en minimal profil-oprettelse (`profiles`-række ved første login, inkl. `locale` og `hide_calories`-felt). Opsæt react-i18next med `en` som kilde-locale og `da` som fuld oversættelse; alle strenge fra 0.3-galleriet og auth-flowet flyttes til nøgler. Sprogvalg gemmes på profilen og i localStorage før login.

**Accept:** login/logout virker; ny bruger får en profiles-række; hele UI'et kan skiftes mellem en/da uden hardcodede strenge tilbage.

### 0.6 AI-gateway (skelet)

> Opret Edge Function `supabase/functions/ai` som eneste indgang til Anthropic API: tager `{ task, payload }`, router til navngivne prompts (foreløbig kun en `ping`-task), kalder API'et server-side, og returnerer valideret JSON (zod). Inkludér CORS-headers med OPTIONS-preflight fra en delt template, auth-tjek (kun indloggede brugere), basal rate-begrænsning pr. bruger og fejllogning uden brugerdata i logs. Tilføj en lille klient-wrapper i `packages/core` (`callAi(task, payload)`).

**Accept:** `ping`-task returnerer gyldigt JSON fra appen; kald uden session afvises; CORS virker fra localhost og Vercel-preview.

### 0.7 Deploy, CI og observability

> Opsæt Vercel-deploy af `app/` med preview-deploys pr. PR, GitHub Actions der kører lint/typecheck/test, Sentry i appen (uden at logge kostdata), og miljøvariabel-håndtering dokumenteret i `docs/env.md`. Tilføj PWA-grundlag: manifest, ikoner og en simpel service worker (app-shell-caching; ingen offline-data endnu).

**Accept:** push til main deployer; PR'er får preview-URL; CI blokerer røde builds; appen kan installeres som PWA på telefon.

**⛳ Fase 0 færdig:** et tomt men lækkert, deploybart skal med designsystem, auth, database, AI-gateway og CI.

---

## FASE 1 — Kerneløkken

### 1.1 OFF-ingestion

> Byg `scripts/ingest-off.ts`: hent Open Food Facts' natlige dump, filtrér til felterne beskrevet i `docs/byggeplan.md` afsnit 5.1 (barcode, navn, brand, kategorier, nutriments, nova_group, nutriscore_grade, additives_tags, ingredienser, allergener, billed-URL), transformér og upsert i `foods` med `source='off'`, `data_quality='crowdsourced'` og indeks på barcode. Start med et dansk/nordisk udsnit (lande-filter) for at holde beta-datasættet håndterbart; gør fuldt globalt load til et flag. Dokumentér kørsel og opdateringskadence i `docs/data.md`, inkl. ODbL-attribution.

**Accept:** et opslag på en kendt dansk stregkode (test med fx en Arla- eller Kims-vare) returnerer korrekt NOVA/Nutri-Score/additiver fra egen DB på <100 ms.

### 1.2 USDA- og Frida-ingestion

> Udvid ingestion med `scripts/ingest-usda.ts` (FoodData Central, `data_quality='verified'`) og `scripts/ingest-frida.ts` (DTU Frida — tjek og notér licensvilkår i `docs/data.md` før brug). Normalisér næringsstofnavne/enheder til ét fælles nutriment-skema i `packages/core` (mapping-tabel), så alle tre kilder kan lægges sammen i én profil. Udfyld `nutrient_references` med EU/DK RDA-NRV-sæt fordelt på køn/alder.

**Accept:** en rå fødevare (fx "havregryn") findes fra både USDA og Frida med sammenlignelige, normaliserede mikronæringsfelter; referencetabellen kan slå dagsbehov op for en given profil.

### 1.3 Stregkodescanning (web)

> Implementér scan-flowet i appen: ScanFAB åbner kameraet, stregkode aflæses i browseren (BarcodeDetector API med ZXing-fallback, struktureret bag et `Scanner`-interface så Capacitor/MLKit kan erstatte implementationen i Fase 5 uden API-ændringer). Ved hit: slå op i `foods`; ved miss: pæn tom-tilstand med mulighed for at søge manuelt. Registrér hændelsen i `scans` med `outcome='checked'`.

**Accept:** en fysisk vare kan scannes på telefon via PWA'en og rammer den rigtige `foods`-række; misses håndteres pænt; scanningen ligger i `scans`.

### 1.4 Scanresultat-arket (verdikt)

> Byg resultat-arket fra byggeplanens afsnit 2.3 og det visuelle oplæg: produktnavn/brand, VerdiktBadge med samlet score, chips for NOVA, additiver og Nutri-Score, additiv-detaljelinje, makrolinje i mono, og de to handlinger "Jeg spiste det" (åbner PortionsStepper → opretter `log_entries`-række og opdaterer `scans.outcome='logged'`) og "Vis bedre alternativ" (foreløbig deaktiveret med "kommer snart"-tilstand). Verdikt-scoren beregnes i `packages/core` (dokumentér formlen i `docs/scoring.md`: vægtning af Nutri-Score, NOVA og additiver — læn dig op ad de navngivne systemer). Delt-element-overgang til en produktdetaljeside.

**Accept:** scan → verdikt → "Jeg spiste det" → posten står i dagbogen; formel + tests i `packages/core`; arket matcher designoplægget i begge tilstande.

### 1.5 Dagbog og manuel logning

> Byg Dagbog-fanen: dagens `log_entries` grupperet i måltider (morgenmad/frokost/aftensmad/snacks) med verdikt-prik, portion og kcal (respektér `hide_calories`), redigér/slet, og en "+"-flow til manuel søgning i `foods` (tekstsøgning på tværs af kilder med kilde-badge) + portionsvalg. Dato-navigation mellem dage.

**Accept:** en hel dags kost kan logges uden scanner; redigering og sletning virker; `hide_calories` skjuler alle kalorietal i fanen.

### 1.6 "I dag"-skærmen (signatur)

> Byg hjem-skærmen præcis som det visuelle oplæg og byggeplanens afsnit 2.2: kvalitetsbue (andel ikke-ultraforarbejdet af dagens indtag), kcal-linje med "skjul"-toggle koblet til `hide_calories`, tre makroringe med animeret optælling (Framer Motion) mod mål fra profilen, mikronæringsstribe (8 nøglestoffer, farvet efter dækning mod `nutrient_references`, "Se alle" folder fuld liste ud sorteret efter laveste dækning), pladsholder-indsigtskort, og dagens måltidslog. Alle beregninger (NOVA-andel, rollups, dækningsgrader) i `packages/core` med tests.

**Accept:** skærmen er en tro gengivelse af mockuppen i lys og mørk; ringene animerer ved ny logning; tallene stemmer med håndberegnede fixtures i tests.

### 1.7 Dagsopsummeringer

> Implementér `daily_summaries`: genberegn (via trigger eller ved skrivning gennem en Edge Function/klient-rutine) dagens makro-, mikro- og NOVA-tal, så "I dag" og senere Indsigt læser hurtigt uden at aggregere rå rækker hver gang. Backfill-script til eksisterende data.

**Accept:** "I dag" læser fra summaries; en ændret log-post opdaterer summaryen; ydelse målbart bedre end rå aggregering ved 100+ poster.

### 1.8 Kerneløkke-polering og e2e

> Afrund Fase 1: Playwright-e2e af kerneløkken (login → scan/manuel logning → verdikt → dagbog → "I dag" opdateret), tomme tilstande og skeletons overalt, fejltilstande (offline, ukendt stregkode), og en gennemgang af alle skærme i begge tilstande mod designsystemet. Ret alt, der afviger fra tokens.

**Accept:** e2e grøn i CI; ingen skærm bruger farver/spacing uden for tokens; appen føles færdig nok til at vise frem.

**⛳ Fase 1 færdig:** produktets hjerte virker — scan og logning i én profil, med kvalitets- og næringsoverblik. Herfra fortsætter Fase 2 (AI: sprogparsing, måltidsscanning med rettetrin, indsigter, alternativer) efter byggeplanens afsnit 9.

---

## Fase 2 — Intelligens og måltidsscanning (trinliste godkendt 2026-07-06)

### 2.1 Naturligt-sprog-logning (bygget 2026-07-06)

> "Skriv hvad du spiste" i +-arket: fri tekst → gateway-task `parse_meal` (første rigtige Anthropic-kald: guardrails, JSON-only, zod, rate limit) → redigerbare rækker matchet mod `foods` → ét tryk logger alle. Diskret "estimat — ret hvis nødvendigt". Payload-indhold logges aldrig.

**Accept:** tekst → AI-forslag som redigerbare rækker → logget i dagbogen; rolig fejlhåndtering (manglende nøgle, rate limit, offline); tone-/format-stikprøve ren.

### 2.2 AI-måltidsscanning (foto) med rettetrin (bygget 2026-07-06)

> Foto af tallerken → genkendte retter som redigerbare rækker (byggeplan §2.3): ret/fjern/tilføj, skydere for portioner, hurtig-knapper for usynlige ingredienser (olie, smør, sauce, dressing). Billeder i privat bucket via signerede URL'er. Scan-typen `photo` findes allerede i scans-tabellen.

**Accept:** foto → redigerbare rækker → log; rettetrinnet (særligt tilføjet fedtstof) genberegner med det samme; "estimat"-mærkning.

### 2.3 Foto af ingrediensliste → analyse + opret vare (bygget 2026-07-06)

> Brugerens ønske fra telefontest: fotografér ingredienslisten/næringsdeklarationen på en vare, der hverken findes hos os eller OFF → AI udtrækker ingredienser, additiver og næringstal → forhåndsvisning → gem som `custom`-vare (verdikt-signal via additiver; NOVA/Nutri kan mangle → ærlig "utilstrækkelig"-håndtering findes).

**Accept:** miss-arket tilbyder "fotografér varedeklarationen"; gemt vare kan scannes/logges fremover.

### 2.4 Ugentlig mønster-indsigt (bygget 2026-07-06)

> Indsigt-fanen bliver rigtig: ugeaggregat fra daily_summaries → AI-fortælling i almindeligt sprog ("sådan spiser du endnu bedre", aldrig "sådan har du fejlet") + enkel trendgraf (Recharts) + konkrete fødevareforslag. Persisteres i `insights`-tabellen. Premium-gate via `useEntitlements()`-stubben.

**Accept:** ugen opsummeres korrekt mod summaries; tonen består stikprøven; gratis tier ser en ærlig teaser.

### 2.5 Bedre alternativ-forslag (bygget 2026-07-06)

> Aktivér knappen fra 1.4: alternativer i samme kategori, vægtet efter kvalitet OG ugens mangler (byggeplan §2.3). Persisteres i `recommendations`. Kandidater hentes fra egne foods (kategorier), AI rangerer og begrunder kort.

**Accept:** knappen virker på scannede varer med kategori; forslag er købbare varer af bedre kvalitet; aldrig moraliserende begrundelser.

**⛳ Fase 2 færdig (2026-07-06):** al intelligens er live — NL-logning, måltidsfoto med rettetrin, deklarationsfoto, ugeindsigt og alternativer, alt gennem den ene AI-gateway med guardrails. Næste: Fase 3 (wearables/forfining) eller design-gennemgangen.

---

## Fase 3 — Integration og forfining (trinliste godkendt 2026-07-06)

Wearable-beslutning: fundament + manuel indtastning nu; HealthKit kobler på samme datalag i Fase 5 (ingen OAuth-leverandører i Fase 3).

### 3.1 Profil-side + rigtige behov (targets v2)

> Profil-fanen bliver rigtig: køn, fødselsår, højde, vægt, aktivitetsniveau, blid målretning, hide_calories, sprog, RDA-region, log ud + LMS-støttelink. Core: `resolveTargets` v2 — Mifflin-St Jeor × NNR-aktivitetsfaktor (1,4/1,6/1,8) ± blid retning (±300 kcal), konservativ bund (1500/1700), protein min. 1,2 g/kg; ufuldstændig profil → NNR-forenklede defaults som hidtil. Migration: `profiles` + `height_cm`/`weight_kg`.

**Accept:** udfyldt profil ændrer målene på "I dag" med det samme; tom profil = uændret adfærd; copy-stikprøve neutral; LMS-link findes.

### 3.2 Aktivitets-/kropsdatalag (wearable-fundamentet)

> Migration: `body_metrics` (vægt pr. dag) + `activity_days` (skridt/aktiv-kcal pr. dag) med RLS og `source`-kolonne ('manual' nu, 'healthkit' m.fl. i Fase 5). Profil-siden: "Log vægt i dag" + lille historik; vægtlog spejler profiles.weight_kg. "I dag": dagens aktiv-kcal lægges neutralt oven i kcal-målet.

**Accept:** vægtlog vises i historik og flytter targets; RLS-bevis for begge tabeller; ingen skyld-sprog.

### 3.3 Bedre portions- og fedtstof-estimering

> Core: dansk husholdningsmåls-tabel (`PORTION_UNITS` + `convertToGrams`) med kilder og tests. Gateway v8: portionsheuristikker i parse_meal/parse_photo_meal + krav om synlig tilberedningsfedt-række ved stegt/friteret. App: enhedsvælger i MealDraftEditor (g/stk/skive/spsk/dl) — databasen forbliver gram.

**Accept:** "2 skiver rugbrød med smør" → fornuftige gram; stegt ret → synlig fedtstof-række; enhedsvælgeren regner rigtigt.

### 3.4 Foto-forfining ud fra brugerrettelser

> Ved log fra fotoflowet gemmes `{ai_items, final_items}` (kun tekst — aldrig billeder) i scans.payload. Core: `buildCorrectionHints` aggregerer seneste ≤20 rettelser (portions-bias, hyppigt tilføjet/fjernet). Hints sendes med i parse_photo_meal som blød kalibrering; ny bruger uden hints = uændret adfærd.

**Accept:** simulerede rettelses-runder flytter estimatet i biasens retning (netværksbevis); payload-indhold logges fortsat aldrig.

**⛳ Fase 3 færdig (2026-07-06):** Profil-siden giver rigtige behov (Mifflin-St Jeor), aktivitets-/kropsdatalaget står klar til HealthKit (Fase 5), portioner estimeres efter danske husholdningsmål med synligt tilberedningsfedt, og fotogenkendelsen kalibreres af brugerens egne rettelser. Næste: Fase 4 (RevenueCat, onboarding, aldersgate, GDPR-flows).

---

## Faste vaner undervejs

- Én gren/PR pr. trin; små commits med conventional commits.
- Nye tabeller = RLS-politikker i samme migration. Nye Edge Functions = CORS-template. Nye strenge = i18n-nøgler i både en og da.
- Tjek hvert nyt UI i mørk tilstand, med `hide_calories` slået til, og med reduceret bevægelse.
- Er du i tvivl om et trin: bed Claude Code læse det relevante afsnit i `docs/byggeplan.md`, før den planlægger.
