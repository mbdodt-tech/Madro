# Åbne spørgsmål

Uafklarede beslutninger fra plan-gennemgangen 2026-07-02. Hvert punkt har en ejer-fase — spørgsmålet skal være afklaret, før det pågældende trin i `docs/fase-tjekliste.md` går i gang.

## Produkt

- [x] **De 8 mikronæringsstoffer i mikrostriben** (afgjort 2026-07-05): mockup-sættet er godkendt — D-vitamin, jern, magnesium, calcium, kalium, B12, folat, zink (`MICRO_STRIP_KEYS` i `@madro/core`). "Se alle" folder fuld liste ud.
- [x] **Standard-makromål** (afgjort 2026-07-05): NNR-forenklet efter køn — kvinde 2000 / mand 2500 / ukendt 2100 kcal, 20/50/30 E% → gram; overstyres felt for felt af profilens `goals`-jsonb (`resolveTargets` i `@madro/core`). Justeres i Profil-UI senere.
- [x] **Verdikt-score-formlen** (afgjort 2026-07-05, se `docs/scoring.md`): 50 % Nutri-Score + 35 % NOVA + 15 % additiver, proportional omvægtning ved manglende data.
- [ ] **Aldersgate** (Fase 0.5/onboarding). Minimumsalder (13 er dansk GDPR-samtykkealder; apps i dette felt vælger ofte højere) og hvad der sker ved afvisning.
- [x] **Auth-omfang** (afgjort 2026-07-04): magic link (primær) + adgangskode (fallback). Ingen social login i beta — Google/Apple genovervejes før Fase 5 (App Store-kravet om Apple Sign-In gælder kun, hvis social login tilbydes).
- [ ] **`hide_calories` default**: foreslået *fra* som standard, tilbydes som valg under onboarding.

## Data & jura

- [x] **Frida kommerciel licens** (researchet 2026-07-05, se `docs/data.md`): fri brug med tydelig kildeangivelse; ingen kommerciel begrænsning i DTU's egne vilkår. Data ingestet fra det officielle DTU Data DOI-datasæt (FCDB v6.1). Anbefalet ikke-blokerende forsigtighedstrin: bekræftelsesmail til fvdb@food.dtu.dk (**venter på brugeren**).
- [x] **ODbL share-alike** (researchet 2026-07-05, se `docs/data.md`): vores OFF-udsnit er en derivative database; share-alike opfyldes via "Om data"-side med transformationsbeskrivelse + dump på forespørgsel; §4.5(a) holder USDA/Frida/custom fri af share-alike, når rækker aldrig blandes på tværs af kilder. Trin 1.1 er ikke blokeret.
- [x] **RDA/NRV-autoritet** (afgjort 2026-07-05): **NNR2023** (Nordiske Næringsstofanbefalinger — grundlaget for de danske kostråd), region 'DK'. Seedet i `nutrient_references` fra `scripts/data/nnr2023.json`. ⚠ **Udestående: værdierne skal granskes mod NNR2023-rapporten før launch** og udvides for øvrige aldersgrupper/graviditet (nu: voksne).
- [ ] **OFF-ingestion runtime** (trin 1.1): hvor kører det natlige job? Anbefaling: GitHub Action på schedule. Tjek Supabase-tier mod forventet tabelstørrelse for det nordiske udsnit.

## Teknik (kan afgøres når trinnet nås)

- [ ] **PostHog**: står i byggeplanen §4.1 (EU-hosted) men ikke i CLAUDE.md's stak-liste. Med i trin 0.7 eller udskudt?
- [ ] **`daily_summaries` genberegning** (trin 1.7): Postgres-trigger vs. Edge Function vs. klient-skrivning.
- [ ] **`useEntitlements()`-stub** fra Fase 0: returnerer gratis-tier for alle, indtil RevenueCat kobles på i Fase 4.

## Afgjort

- [x] **Produktnavn: Madro** (2026-07-02).
- [x] **Visuelt designoplæg bygges før Fase 0** — ligger i `docs/design/mockup/` (2026-07-02).
- [x] **Konti klar**: Supabase-projekt (EU), GitHub-repo, Vercel, Anthropic API-nøgle (2026-07-02).
