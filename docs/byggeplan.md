# Byggeplan: Kost- & produktscannings-app

*Ambitiøs, kommerciel udgave. Solo-build med Claude Code. React + Vercel frontend, Supabase backend, Deno Edge Functions, Anthropic API server-side, RevenueCat til abonnement, Capacitor til native. Flersproget fra dag ét. Design er den vigtigste enkeltdisciplin i dette dokument.*

*Køleskab-til-opskrift er bevidst udskudt. Alt andet arkitekteres fra dag ét, men bygges i en styret rækkefølge, så intet skal laves om senere.*

---

## 0. Sådan læses planen

Planen er skrevet til at kunne fodres til Claude Code sektion for sektion. Den er opdelt i tre lag:

* **Hvad vi bygger** (afsnit 1-3): vision, produktoplevelse, designsystem.
* **Hvordan det hænger sammen** (afsnit 4-7): arkitektur, data, AI, betaling.
* **Hvordan det leveres** (afsnit 8-12): tværgående spor, roadmap, arbejdsgang, go-to-market, næste skridt.

Beslutninger, hvor jeg har valgt for dig, er markeret som **Anbefaling** — de kan ændres, men de er begrundede.

---

## 1. Vision og bærende principper

### 1.1 Produktet i én sætning
En app, der samler *"hvor god er kvaliteten af det, jeg spiser?"* (NOVA, additiver, Nutri-Score) og *"hvad indtager jeg af makro- og mikronæring?"* i **én sammenhængende profil** — smukkere og lettere at bruge end noget, der findes i dag.

### 1.2 De fem principper (rangordnet)
1. **Design og flow først.** Appen skal føles ubesværet. Overgange glider, funktioner hænger sammen, og et enkelt blik giver overblik. Dette er ikke pynt til sidst — det er fundamentet, og alt andet underordnes det.
2. **Én profil, to scanninger.** En produktscanning og en kostlogning lander i samme datasæt. Brugeren ser altid helheden: kvalitet *og* næring, dag for dag og uge for uge.
3. **Kvalitet frem for skyld.** Fokus på fødevarekvalitet og dækning — ikke på restriktion. Neutralt, støttende sprog. Kalorietal kan skjules. (Uddybet som tværgående spor i afsnit 8.)
4. **Præcision man kan stole på.** Data mærkes tydeligt med kilde og pålidelighed. Verificerede kilder (USDA/Frida) foran crowdsourcede, hvor det tæller.
5. **Bygget til at vokse.** Datamodel, AI-lag, betalings- og sproglag er foundational fra dag ét, så nye funktioner (og køleskabsfunktionen senere) slotter ind uden ombygning.

---

## 2. Produktoplevelsen

### 2.1 Informationsarkitektur og navigation
Fem destinationer i en bundlinje, med scanning som det visuelle omdrejningspunkt:

| Fane | Formål |
|---|---|
| **I dag** (hjem) | Dagens samlede billede: kvalitet + makroer + mikronæring i ét view. Appens hjerte. |
| **Dagbog** | Kronologisk log grupperet i måltider; hurtig tilføjelse; rediger portioner. |
| **Scan** (stor, central FAB) | To indfangningsmåder i én knap: **stregkode** (pakkevarer) og **måltidsfoto** (retter uden stregkode). Åbner et resultat-ark. |
| **Indsigt** | Uge-/månedstendenser + AI-fortælling ("38 % ultraforarbejdet i denne uge; lav på magnesium"). |
| **Profil** | Mål, kostpræferencer, sprog, RDA-profil, abonnement, indstillinger (fx skjul kalorier). |

**Anbefaling:** central hævet Scan-knap. Scanning er den hyppigste og mest "magiske" handling og skal være ét tommelfingertryk væk fra alt.

### 2.2 Signaturskærmen — "I dag"
Dette er den skærm, hele produktet står og falder med, og hvor Yuka-klarhed og Cronometer-dybde smelter sammen. Ét scrollbart hero-kort med tre lag:

1. **Kvalitetsbue.** En blød cirkelbue øverst, der viser hvor stor en andel af dagens indtag der *ikke* er ultraforarbejdet (NOVA 1-3 vs. 4). Ét blik: "i dag spiser du rent" eller "i dag er tungt forarbejdet."
2. **Makroringe.** Tre koncentriske/side-om-side ringe (protein, kulhydrat, fedt) med et centralt kalorietal — som kan **skjules** til fordel for et kvalitets-/balancemål. Ringe fyldes med animeret optælling, når man logger.
3. **Mikronæringsstribe.** En vandret række små indikatorer (én pr. nøglemikronæringsstof), der viser dækning i forhold til dagens reference (RDA/NRV). Tryk udvider til Cronometer-dyb liste over alle sporede næringsstoffer, sorteret efter hvad man er lavest på.

Under hero'en: dagens log i måltidsgrupper, en hurtig "+"-tilføjelse, og et lille AI-indsigtsteaser-kort ("Du mangler jern i denne uge — se forslag").

**Hvorfor dette virker:** det er præcis krydsfeltet, ingen konkurrent leverer — kvalitet *og* næring i samme øjebliksbillede — og det er designet, så en nybegynder forstår buen på et sekund, mens en data-nørd kan folde mikronæringen helt ud.

### 2.3 Nøgleflows (med bevidst bevægelse)

**Scan → verdikt → handling**
Kamera åbner → stregkode fanges → et resultat-ark glider op med: farvet verdikt-badge (kvalitet), makrooverblik, additiv-flag, Nutri-Score. To tydelige handlinger:
* **"Jeg spiste det"** → portionsvælger → logges → "I dag" opdateres med animerede ringe.
* **"Vis bedre alternativ"** → AI-anbefalede alternativer i samme kategori, vægtet efter både kvalitet og hvad brugeren mangler i ugen.
Resultat-arket bruger en delt-element-overgang (shared element) til fuld produktdetalje, så intet "hopper".

**Skelnen mellem "tjekket" og "spist"**
En scanning kan ende to steder: som en ren *check* (jeg overvejer at købe) eller som en *logning* (jeg spiste). Begge gemmes; kun logninger tæller i dagens profil. Det giver præcis den "smid væk / vælg bedre"-løkke, du efterspurgte, uden at forurene næringsdata.

**Naturligt sprog / hurtig logning**
Skriv eller sig "to skiver rugbrød med ost og en banan" → AI parser til poster med portioner → bekræft med ét tryk.

**Måltidsscanning og rettelse (foto)**
For mad uden stregkode — hjemmelavet eller på restaurant — tager man et billede af tallerkenen. AI genkender retter og estimerer portioner og lægger dem frem som **redigerbare rækker**, ikke som et låst facit. Herfra kan man:
* rette en fejlgenkendelse eller justere en portion med en enkel skyder,
* tilføje eller fjerne en ret, og
* tilføje de "usynlige" ingredienser, kameraet ikke kan se — **olie, smør, sauce, dressing** — via hurtig-knapper eller fri tekst ("tilføj en spsk olivenolie"), hvorefter tal og næring genberegnes med det samme.

Et diskret sikkerhedsniveau (fx "estimat — ret hvis nødvendigt") kommunikerer ærligt, at et foto er et skøn. Rettelser huskes, så systemet bliver bedre over tid, og hvor der findes en stregkode eller næringsdeklaration, opfordrer appen til at scanne den for højere præcision. Netop rettetrinnet — særligt tilføjet fedtstof — er det, der løfter fotologning fra legetøj til værktøj; det er præcis dér, rene foto-apps rammer et nøjagtighedsloft, fordi et kamera ikke kan se olie, sauce eller skjult mad.

**Indsigt**
Ugevisning → AI-fortælling i almindeligt sprog + en enkel trendgraf → konkrete fødevareforslag, der lukker hullerne. Rammen er altid "sådan spiser du endnu bedre", aldrig "sådan har du fejlet".

---

## 3. Designsystem (topprioritet)

Målet: **Yuka × Cronometer, men mere poleret** — Yukas øjeblikkelige, farvekodede klarhed og legende kort, Cronometers datatæthed og troværdighed, pakket i et roligt, moderne udtryk i familie med Linear/Arc. Systemet defineres som tokens fra dag ét, så det er konsistent på tværs af hele appen.

### 3.1 Brandretning og navn
Personlighed: **rolig, præcis, nærende, moderne.** Ikke skinger sundheds-app; nærmere "et smukt instrument til at forstå din mad."

**Navnekandidater** (dit valg — tjek varemærke og domæne før beslutning): *Klart*, *Vera*, *Nourish*, *Rene*, *Basi*. Jeg holder pladsen som `[Produktnavn]` i resten af planen.

### 3.2 Farver
En sofistikeret, let afdæmpet palet — bevidst væk fra Yukas mættede trafiklys.

**Lys tilstand**
| Rolle | Hex |
|---|---|
| Baggrund | `#FBFBF9` (varm off-white) |
| Flade / kort | `#FFFFFF` |
| Tekst primær ("ink") | `#16201C` |
| Tekst sekundær | `#5B665F` |
| Tekst tertiær | `#8A938C` |
| **Brand primær** (evergreen) | `#0E7A5E` |
| Brand hover | `#0B6650` |
| Brand tint (baggrund) | `#E7F2ED` |
| Accent (varm, sparsom) | `#E8A13A` |
| Hårlinje / kant | `rgba(20,30,25,0.08)` |

**Verdikt-skala** (kvalitet/NOVA — afdæmpet, ikke alarmerende)
| Niveau | Hex |
|---|---|
| Fremragende | `#2FA36B` |
| God | `#7FB552` |
| Middel | `#E0A63C` |
| Ringe | `#E27A54` |
| Meget ringe | `#C9503C` |

**Mørk tilstand** (førsteklasses, ikke en eftertanke)
| Rolle | Hex |
|---|---|
| Baggrund | `#0C1210` |
| Flade | `#131B18` |
| Hævet flade | `#1A2420` |
| Tekst primær | `#EAF0EC` |
| Tekst sekundær | `#9AA6A0` |
| Brand primær | `#35C495` (lysere for kontrast) |
| Brand tint | `#12241E` |

Verdikt-skalaen løftes ca. 8-10 % i lyshed i mørk tilstand. Al farvebrug skal bestå WCAG AA-kontrast (afsnit 8).

### 3.3 Typografi
**Anbefaling:** **Geist Sans** til UI/tekst og **Geist Mono** til tal og data. Geist er moderne, neutralt og premium — og en naturlig makker til Vercel. Mono-tallene giver mikro-/makrodata et præcist "instrument"-look à la Cronometer, men renere. (Alternativer: Satoshi/General Sans/Inter til UI.)

Type-ramme (px / linjehøjde / vægt):
* Display 32 / 40 / 600
* H1 24 / 32 / 600
* H2 20 / 28 / 600
* Body 16 / 24 / 400
* Small 14 / 20 / 400-500
* Caption 12 / 16 / 500
* **Tal (mono):** tabular figures overalt, hvor værdier sammenlignes.

### 3.4 Rum, radius, dybde
* **Grid:** 4-pt base (4, 8, 12, 16, 20, 24, 32, 40, 48, 64).
* **Radius:** sm 10, md 14, lg 18, xl 24, pille 999. Generøs, blød, moderne.
* **Dybde:** subtile, lagdelte skygger i lys tilstand (`0 1 3 rgba(20,30,25,.06)` niveau 1, dybere til ark). I mørk tilstand: brug fladelyshed + hårlinjer frem for skygge.

### 3.5 Bevægelse (det, der får det til at "glide")
**Anbefaling:** **Framer Motion** (`motion`) som eneste bevægelses-lag, så alt føles ensartet.
* **Easing:** spring (stiffness ~300, damping ~30) til interaktion; `cubic-bezier(.2,0,0,1)` ved indgang, hurtigere ved udgang. Varighed 180-260 ms.
* **Signaturovergange:** delt-element (`layoutId`) fra scanresultat til detalje; faneskift = diskret vandret glid + krydsfade; ring- og taloptælling på "I dag"; scan-arket kommer op med spring-fysik.
* **Regel:** ingen hårde klip. Konsistent spring + delt layout = den smidige, sammenhængende fornemmelse, du prioriterer højest.

### 3.6 Komponentbibliotek
**Anbefaling:** byg på **Radix UI-primitiver** (tilgængelighed) + **Tailwind** (tokens ovenfor sættes som CSS-variabler/Tailwind-tema) + **Framer Motion**. Brug shadcn/ui som *udgangspunkt*, men tilpas kraftigt, så det ikke ligner standard.

Kernekomponenter: AppShell, BottomTabBar, central ScanFAB, Card, VerdiktBadge, MakroRing, NæringsstofBar/Chip, MikronæringsStribe, TodayHero, ProduktResultatArk, PortionsStepper, AlternativKort, IndsigtKort, TrendGraf, Paywall, OnboardingCarousel, EmptyStates, Toasts, Skeletons.

### 3.7 Ikoner og illustration
Ét konsistent, moderne stregikonsæt (fx Lucide, som passer Geist/Radix-æstetikken). Sparsom, varm spot-illustration til onboarding og tomme tilstande — venlig, ikke barnlig.

---

## 4. Teknisk arkitektur

### 4.1 Stak (beslutninger truffet)
| Lag | Valg |
|---|---|
| Frontend | **React + Vite + TypeScript** |
| Styling | **Tailwind CSS** (designtokens som tema) + Radix-primitiver |
| Bevægelse | **Framer Motion** |
| Datavisualisering | Recharts til standardgrafer; **custom SVG/D3** til signaturvisualiseringer (kvalitetsbue, ringe, mikrostribe) |
| Serverstate | **TanStack Query** |
| Letvægts klientstate | **Zustand** |
| i18n | **react-i18next** (opsat fra dag ét) |
| Backend | **Supabase** (Postgres, Auth, Storage, RLS) |
| Serverlogik / AI | **Deno Edge Functions** (Anthropic API server-side) |
| Native indpakning | **Capacitor** |
| Betaling | **RevenueCat** (orkestrerer Stripe på web + StoreKit/Google Play Billing native) |
| Hosting (web) | **Vercel** |
| Fejl/analytics | **Sentry** + privatlivsvenlig analytics (PostHog, EU-hosting) |

### 4.2 Native-strategi — hvorfor Capacitor
**Anbefaling: Capacitor.** Én React-kodebase → udrulles som web (Vercel) *og* pakkes til iOS/Android. Native plugins dækker det, der skal være native: kamera og hurtig, offline stregkodescanning (`@capacitor-mlkit/barcode-scanning`), og RevenueCat har officiel Capacitor-støtte. Det holder din "PWA-først → native"-vej ren, uden at vedligeholde to kodebaser.
*Alternativ:* React Native/Expo giver "ægte" native, men er en separat kodebase fra weben — mere arbejde solo, og du mister genbrug. Capacitor er det rigtige valg her.

### 4.3 AI-servicelag (foundational fra dag ét)
Al AI går gennem ét internt gateway-Edge-Function (`/functions/ai`), aldrig direkte fra klienten. Fordele: nøglen bliver server-side (GDPR + sikkerhed), ensartet logging/rate-styring, og du kan opgradere modeller ét sted. Funktioner bag gatewayen: scan-afstemning, sprogparsing af logning, mønster-indsigt, alternativforslag og (senere) foto-genkendelse. **Husk CORS-headers på alle Edge Functions** (din kendte gotcha).

### 4.4 Betalingsabstraktion
Al adgangskontrol bag én hook, fx `useEntitlements()`, der spejler RevenueCat-entitlements. Ingen feature spørger Stripe eller app-butikken direkte. Det gør premium-gating trivielt og gør web/native-forskellen usynlig for resten af koden.

---

## 5. Datastrategi og datamodel

### 5.1 Datakilder (arkitekteret ind fra start)
| Behov | Kilde | Note |
|---|---|---|
| Pakkevarer, stregkode, **NOVA**, additiver, Nutri-Score | **Open Food Facts** (natligt dump cachet i Postgres) | ODbL — kredit + vurder "share-alike" for afledt database juridisk |
| Dybe **mikronæringsstoffer** + hele fødevarer/råvarer | **USDA FoodData Central** | Public domain; laboratorie-analyseret |
| **Dansk beta** + danske fødevarer/retter | **Frida** (DTU Fødevareinstituttet) | Verificér vilkår for kommerciel brug |
| Senere: bred branded/restaurant globalt | Kommerciel API (Nutritionix/Edamam/FatSecret Platform) | Først når dækningshuller er dokumenterede |

**OFF-ingestion:** hent det natlige JSONL/CSV-dump, filtrér til relevante felter (barcode, navn, brands, kategorier, nutriments, `nova_group`, `nutriscore_grade`, `additives_tags`, ingredienser, allergener, billeder), transformér og indlæs i vores egen `foods`-tabel med barcode-indeks. Vi serverer fra egen DB → ingen rate-limit-problemer, hurtige opslag. Produkter uden for OFF: fald tilbage til OFF's live-API + tillad brugerbidrag.

**Referenceværdier:** locale-bevidste RDA/NRV (EU vs. US vs. DK, samt køn/alder) i en `nutrient_references`-tabel — nødvendigt for mikronæringsdækning og for indsigt.

### 5.2 Datamodel (kerneskema)
Forenklet; alt med **RLS slået til pr. bruger** (din kendte gotcha).

* **profiles** — mål, kostpræferencer, `locale`, RDA-profil (køn/alder/aktivitet), indstillinger (fx `hide_calories`), abonnementsstatus (spejl af RevenueCat).
* **foods** — kanonisk fødevarepost: `source` (off/usda/frida/custom), `barcode`, navn, `nova_group`, `nutriscore`, `additives`, ingredienser, allergener, `nutriments` (JSONB inkl. mikronæring), `data_quality` (verificeret/brugerindtastet), billed-URL.
* **log_entries** — indtag: `food_id`, mængde/enhed, `meal`, `consumed_at`. Samme tabel for scannede produkter og loggede råvarer → én profil.
* **scans** — scanningshændelser: type (barcode/foto), resultat, og `outcome` (`checked` vs `logged`) → skelnen mellem "overvejede" og "spiste".
* **daily_summaries** — beregnede/materialiserede dagsopsummeringer (makro, mikro, forarbejdningsandel) for hurtige overblik.
* **insights** — AI-genererede mønster-indsigter (ugentlige).
* **recommendations** — alternativforslag knyttet til en scanning/dag.

**Storage-gotcha:** signerede vs. offentlige URL'er — brugeruploads (fotos) i private buckets med signerede URL'er; produktbilleder kan være offentlige. Pre-opret buckets (din kendte gotcha).

---

## 6. AI-funktioner (mest avancerede omfang, alt planlagt fra start)

Alle kalder Claude via AI-gatewayen (afsnit 4.3). Bygges i rækkefølge (afsnit 9), men skemaet rummer dem alle.

1. **Scan-afstemning.** Når en produktscanning og en kostlogning skal lande i samme profil, normaliserer AI enheder, portioner og navne, så de to datastrømme er sammenlignelige og additive.
2. **Sprogparsing af logning.** Fri tekst/tale → strukturerede poster med portioner (returneres som streng-JSON, parses sikkert).
3. **Måltidsscanning / foto-logning (vision).** En kernefunktion, ikke en tilføjelse. Foto af en tallerken → genkendelse af retter + portionsestimat → resultatet præsenteres som **redigerbare rækker**, hvor brugeren kan rette genkendelse, justere portioner, tilføje/fjerne retter og — vigtigst — tilføje de fedtstoffer og tilsætninger, kameraet ikke kan se (olie, smør, sauce, dressing) via hurtig-knapper eller fri tekst, med øjeblikkelig genberegning. Rettelser persisteres, så modellen forbedres over tid. Stregkode og foto dækker to forskellige behov: **stregkode** giver pakkevarens fulde kvalitetsvurdering (NOVA/additiver/Nutri-Score) *og* næring, mens **foto** dækker uindpakket mad, hvor der ingen deklaration er — begge lander i samme profil. Usikkerhed kommunikeres ærligt, og appen foreslår stregkode-/deklarationsscanning, hvor det giver højere præcision.
4. **Mønster-indsigt.** Ugentlig analyse: "38 % af dit indtag var ultraforarbejdet; du er lav på magnesium og D-vitamin" — i neutralt, opmuntrende sprog.
5. **Alternativforslag.** Ved dårlig verdikt: bedre varer i samme kategori, vægtet efter både kvalitet *og* ugens huller.

**Guardrails:** neutral, ikke-dømmende tone i alle AI-svar; ingen skyld-framing; ingen individuel sundhedsrådgivning/diagnose (holder appen fri af medicinsk-udstyr-grænsen, afsnit 8). Brug de navngivne systemer (NOVA, Nutri-Score, EFSA) frem for egne domme; undgå ordet "farlig".

---

## 7. Abonnement og monetering

**Model:** freemium med RevenueCat på tværs af web (Stripe) og native (IAP).

* **Gratis (brugbar kerne):** stregkodescanning, verdikt (NOVA/additiver/Nutri-Score), basal dagbog, dagens overblik.
* **Premium:** dyb mikronæring + ugemønstre ("magnesium"-indsigt), AI-fotologning, naturligt-sprog-logning, alternativforslag med næringshensyn, wearable-integration, eksport.
* **Pris:** årligt abonnement i intervallet ca. 40-70 USD/år (benchmark fra markedsanalysen), med kort, ærlig prøveperiode — ingen skjult uge-paywall.
* **Paywall-design:** følger designsystemet; viser konkret værdi (fx et sløret glimt af mikronæringsdybden), ikke pres.
* **Senere:** B2B/enterprise-spor (arbejdsgivere/sundhed) — markedets hurtigst voksende delsegment, men først efter forbrugerlanceringen.

---

## 8. Tværgående spor (gælder hele vejen)

* **Ansvarligt design.** Neutral, støttende framing; ingen skyld-mekanik (ingen "røde tal"-skæld-ud); mulighed for at **skjule kalorietal** og fokusere på kvalitet/balance; aldersgating; og en indbygget vej til relevant, lokal støtte ved tegn på problematisk brug (i Danmark fx Landsforeningen mod spiseforstyrrelser og selvskade, LMS). Dette er både etisk nødvendigt, et App Store-hensyn og en reel differentiator, fordi de store gør det dårligt.
* **GDPR/privatliv.** Kostdata behandles som følsomme helbredsdata: stram RLS, dataminimering, klart samtykke, EU-datalagring hvor muligt, og eksport/slet-funktioner. Alle AI-kald server-side, så brugerdata ikke lækkes til klienten.
* **Tilgængelighed.** Radix-primitiver, WCAG AA-kontrast, fuld tastatur-/skærmlæser-støtte, respektér "reduce motion".
* **Performance.** Hurtig scanning (offline barcode native), optimistiske UI-opdateringer, cachede opslag fra egen DB, doven indlæsning af tunge views.
* **Test og observability.** Enhedstest af beregningslogik (makro/mikro-rollups), e2e på kerneflows, Sentry til fejl, privatlivsvenlig produktanalyse.
* **Flersprogethed.** i18n fra dag ét. **Anbefaling:** engelsk som kilde-/standardlocale i koden (lettest, bedst tooling), **dansk som første fuldt lokaliserede sprog og beta-lanceringssprog** (matcher Frida + hjemmemarked). Locale styrer også referenceværdier (RDA/NRV) og talformater.

---

## 9. Roadmap og milepæle

Alt arkitekteres fra dag ét (datamodel, AI-gateway, betalingsabstraktion, i18n, designsystem), men bygges i denne rækkefølge, så du altid har noget, der virker, og intet skal rives op.

* **Fase 0 — Fundament.** Monorepo, designsystem som tokens/komponenter, Supabase-projekt + skema + RLS, Auth, i18n-stillads, AI-gateway-skelet, Vercel-CI/CD, Sentry. *Resultat: tomt, men "lækkert" skal.*
* **Fase 1 — Kerneløkken (web/PWA).** Stregkodescanning → verdikt → log → "I dag"-overblik (makro + mikro) + dagbog. Den samlede profil. OFF + USDA + Frida indlæst. Indfangnings-arkitekturen bygges multi-modal fra start (stregkode nu; foto/tekst slotter ind i Fase 2 uden ombygning). *Resultat: produktets hjerte virker.*
* **Fase 2 — Intelligens og måltidsscanning.** Scan-afstemning, naturligt-sprog-logning, **AI-måltidsscanning (foto) med rettetrin**, ugentlig mønster-indsigt, alternativforslag.
* **Fase 3 — Integration og forfining.** Wearable/Apple Health-integration, forbedret portions- og fedtstof-estimering, og forfining af foto-nøjagtighed ud fra brugerrettelser.
* **Fase 4 — Monetering & polering.** RevenueCat-paywall, premium-gating, onboarding, bevægelses-finish.
* **Fase 5 — Native.** Capacitor-indpakning, native kamera/barcode, app-butiks-indsendelse, IAP via RevenueCat.
* **Fase 6 — Lancering.** Dansk beta → global. (B2B og køleskabsfunktion ligger efter dette.)

Jeg kan lave en detaljeret opgaveliste pr. fase (som en tjekliste, du kan give Claude Code én ad gangen), når du vil.

---

## 10. Sådan arbejder du med Claude Code på det

* **Monorepo** med tydelig opdeling: `app/` (React/Vite-web), `supabase/` (migrationer, Edge Functions), `packages/ui` (designsystem/komponenter, delt), `packages/core` (beregningslogik, typer), og senere `native/` (Capacitor).
* **En opdateret `CLAUDE.md`** oven på din eksisterende: dokumentér den nye stak og dine kendte gotchas — RLS-politikker, signerede vs. offentlige storage-URL'er, bucket-pre-oprettelse, Edge Function CORS-headers — plus de nye: designtokens som eneste kilde til styling, AI kun via gateway, adgang kun via `useEntitlements`, og i18n-nøgler frem for hårdkodet tekst.
* **Byg fase for fase.** Fodr Claude Code én milepæl ad gangen fra afsnit 9; hold PR'er små; commit designsystemet tidligt, så alt bygges oven på det.

---

## 11. Go-to-market (kort)

* **Positionering:** *"Forstå kvaliteten af det, du spiser — forarbejdning, additiver, makroer og mikronæring samlet i ét billede, uden skyld."*
* **Sekvens:** dansk beta (Frida + lokalt marked) → global engelsk lancering.
* **Medvind:** den voksende UPF-/forarbejdnings-tendens, som ingen tracking-app dækker godt.
* **Kanaler:** indholds-/influencer-drevet (scan-øjeblikket er stærkt på kortvideo), freemium som vækstmotor.

---

## 12. Næste skridt

Tre naturlige veje herfra — vælg én, så fortsætter vi:

1. **Visuelt designoplæg.** Da design er din topprioritet, kan jeg lave et konkret, klikbart designudkast af "I dag"-skærmen og scan-flowet (i lys og mørk tilstand) ud fra designsystemet ovenfor — så du kan se og mærke det, før noget bygges.
2. **Detaljeret Fase 0-1-tjekliste** til Claude Code, klar til at gå i gang med det tekniske fundament og kerneløkken.
3. **Word-udgave + Google Drev.** Jeg kan lægge både denne plan og markedsanalysen som Word-dokumenter på dit Google Drev.
