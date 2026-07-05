# Verdikt-scoren

**Version 1 — godkendt 2026-07-05.** Implementeret i `packages/core/src/verdict/verdict.ts` med kalibrerings-eksemplerne som tests. Denne fil er kilden til "Om verdikten"-forklaringen i UI'et.

## Princip

Verdikten sammenfatter **tre navngivne, eksterne systemer** i ét tal (0-100, højere = bedre) og fem niveauer. Madro opfinder ingen egne sundhedsdomme — vi vægter blot etablerede klassifikationer og viser altid komponenterne transparent ("Derfor"-listen på produktsiden).

## Formel

`score = 0,50 × NutriScorePoint + 0,35 × NovaPoint + 0,15 × AdditivPoint`

| Komponent | Vægt | Mapping |
|---|---|---|
| **Nutri-Score** (ernæringskvalitet, EU-mærkningssystem) | 50 % | a=100 · b=80 · c=55 · d=30 · e=10 |
| **NOVA** (forarbejdningsgrad, universitetet i São Paulo/FAO) | 35 % | 1=100 · 2=75 · 3=45 · 4=10 |
| **Additiver** (antal E-numre, EFSA-registrerede) | 15 % | 0=100 · 1-2=70 · 3-5=40 · 6+=10 |

**Niveauer** (matcher designsystemets verdikt-tokens):

| Score | Niveau (da) | Token |
|---|---|---|
| 80-100 | Fremragende | excellent |
| 60-79 | God | good |
| 40-59 | Middel | mid |
| 20-39 | Ringe | poor |
| 0-19 | Meget ringe | bad |

## Manglende data

- Mangler **én** komponent: de resterende omvægtes proportionalt (fx uden additiv-info: Nutri 50/85, NOVA 35/85). Ingen kunstig fortynding mod midten.
- Mangler **både Nutri-Score og NOVA**: ingen score. UI viser "utilstrækkelige data til verdikt" — vi viser aldrig et opfundet tal (ansvarlighedsregel i CLAUDE.md).

## Kalibrerings-eksempler (= testfixtures)

| Vare | Input | Score | Niveau |
|---|---|---|---|
| Havregryn | a · NOVA 1 · 0 add. | 100 | Fremragende |
| KiMs Peanuts | a · NOVA 3 · 0 add. | 81 | Fremragende |
| Arla Smør | e · NOVA 2 · 0 add. | 46 | Middel |
| Snackchips | d · NOVA 4 · 2 add. | 29 | Ringe |
| Sodavand | e · NOVA 4 · 3 add. | 15 | Meget ringe |

## Rationale for vægtene

- **Ernæring tungest (50 %):** Nutri-Score har det bredeste videnskabelige grundlag og er det system, danske forbrugere møder på emballagen.
- **Forarbejdning næsttungest (35 %):** NOVA er appens kerneopdagelse — skellet mellem råvarer og ultraforarbejdet er dét, Madro tilføjer oven på klassisk kalorietælling.
- **Additiver selvstændigt men let (15 %):** antallet er et transparent, letforståeligt signal. Fordi additiver også indgår indirekte i NOVA 4-klassifikationen, holdes vægten lav for at undgå dobbelt-straf.

## Kendte begrænsninger / v2-kandidater

- Additiv-komponenten tæller kun antal — EFSA-baserede risikoklasser pr. additiv (så fx E300/C-vitamin ikke tæller som E621) er den vigtigste v2-forbedring.
- Nutri-Score 2023-algoritmen (opdateret for drikkevarer/sødemidler) følger med OFF's data automatisk.
- Drikkevarer og fødevarer scorer på samme skala; en separat drikkevare-kalibrering kan overvejes.

Ændringer i formlen kræver produktejerens godkendelse og en version-bump her i filen.
