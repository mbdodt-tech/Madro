# Åbne spørgsmål

Uafklarede beslutninger fra plan-gennemgangen 2026-07-02. Hvert punkt har en ejer-fase — spørgsmålet skal være afklaret, før det pågældende trin i `docs/fase-tjekliste.md` går i gang.

## Produkt

- [ ] **De 8 mikronæringsstoffer i mikrostriben** (trin 1.6). Mockuppen bruger et foreløbigt sæt: D-vitamin, jern, magnesium, calcium, kalium, B12, folat, zink. Skal godkendes eller justeres.
- [ ] **Verdikt-score-formlen** (trin 1.4). Aftalt proces: Claude foreslår en konkret vægtning af Nutri-Score + NOVA + additiver i `docs/scoring.md`; brugeren godkender før den shippes.
- [ ] **Aldersgate** (Fase 0.5/onboarding). Minimumsalder (13 er dansk GDPR-samtykkealder; apps i dette felt vælger ofte højere) og hvad der sker ved afvisning.
- [ ] **Auth-omfang** (trin 0.5). Magic link alene, eller også Google/Apple fra start? OBS: enhver social login udløser krav om Apple Sign-In ved App Store-indsendelse i Fase 5.
- [ ] **`hide_calories` default**: foreslået *fra* som standard, tilbydes som valg under onboarding.

## Data & jura

- [ ] **Frida kommerciel licens** (gater trin 1.2). Byggeplanen kræver verifikation af DTU's vilkår for kommerciel brug før ingestion.
- [ ] **ODbL share-alike** (gater trin 1.1). Vurdér om vores cachede OFF-afledte `foods`-tabel er en afledt database under ODbL, og hvad det forpligter til (attribution er allerede planlagt; share-alike er det åbne spørgsmål).
- [ ] **RDA/NRV-autoritet** til `nutrient_references` (trin 1.2): EFSA DRV vs. NNR2023 (som Danmark følger) vs. EU-mærknings-NRV — og hvor maskinlæsbare værdier hentes.
- [ ] **OFF-ingestion runtime** (trin 1.1): hvor kører det natlige job? Anbefaling: GitHub Action på schedule. Tjek Supabase-tier mod forventet tabelstørrelse for det nordiske udsnit.

## Teknik (kan afgøres når trinnet nås)

- [ ] **PostHog**: står i byggeplanen §4.1 (EU-hosted) men ikke i CLAUDE.md's stak-liste. Med i trin 0.7 eller udskudt?
- [ ] **`daily_summaries` genberegning** (trin 1.7): Postgres-trigger vs. Edge Function vs. klient-skrivning.
- [ ] **`useEntitlements()`-stub** fra Fase 0: returnerer gratis-tier for alle, indtil RevenueCat kobles på i Fase 4.

## Afgjort

- [x] **Produktnavn: Madro** (2026-07-02).
- [x] **Visuelt designoplæg bygges før Fase 0** — ligger i `docs/design/mockup/` (2026-07-02).
- [x] **Konti klar**: Supabase-projekt (EU), GitHub-repo, Vercel, Anthropic API-nøgle (2026-07-02).
