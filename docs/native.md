# Native køreplan (fase 5) — dine skridt fra testperiode til App Store

Alt det tekniske er bygget: Capacitor-skallen (`native/`), native MLKit-scanning,
CI-workflowet og ikoner/splash. Dette dokument er rækkefølgen på DINE skridt.
Intet af det kræver kodeændringer — kun konti, nøgler og klik.

## 0. Nu (ingen konti nødvendige)

- **Web-PWA'en er din primære testkanal** (madro.vercel.app) — alt virker dér.
- **Android-APK uden videre:** GitHub → Actions → **Native** → *Run workflow*.
  Efter ~10 min ligger `madro-debug-apk` som artefakt — download og sideload
  på en Android-telefon (tillad "ukendte kilder"). iOS-jobbet i samme kørsel
  er kompileringsbeviset for skallen.
- Kør workflowet igen efter større ændringer — det bygger altid nyeste main.

## 1. Testperiode-tjekliste (når du tester native builds)

1. **Native stregkodescanning (5.2)** — første punkt: scan 3-4 rigtige varer.
   Koden er skrevet efter plugin-dokumentationen, men har aldrig rørt en
   fysisk telefon. Fejler den: sig til, så justerer vi mod virkeligheden.
2. Splash + ikon ser rigtige ud (dyb evergreen, lysende M).
3. Tab-baren respekterer iPhone-hjemmeindikatoren (safe-area).
4. Login m. adgangskode virker i skallen (magic link kræver deep links —
   sig til, hvis du vil have dem prioriteret).
5. Måltidsfoto + deklarationsfoto med det rigtige kamera.
6. HealthKit (se §4) — aktiveres FØRST når ovenstående er stabilt.

## 2. Apple Developer + TestFlight (99 USD/år)

1. Opret Apple Developer-konto (developer.apple.com) — kan tage 1-2 dage.
2. App Store Connect → ny app: bundle-id **dk.madro.app** (må ikke ændres),
   navn Madro, primært sprog dansk.
3. Certifikat + profil: App Store Connect → Users and Access → Keys →
   ny API-nøgle (App Manager). Distribution-certifikat + provisioning-profil
   laves i developer-portalen (workflowet forklarer felterne).
4. GitHub-secrets (Settings → Secrets and variables → Actions):
   `APPSTORE_ISSUER_ID`, `APPSTORE_KEY_ID`, `APPSTORE_P8`,
   `BUILD_CERTIFICATE_BASE64`, `P12_PASSWORD`, `PROVISION_PROFILE_BASE64`.
5. Repo-variabel `APPLE_READY` = `true` → næste "Run workflow" uploader til
   TestFlight, og du installerer Madro på din iPhone via TestFlight-appen.

## 3. Betaling (efter din testperiode — rækkefølgen er din beslutning 2026-07-06)

1. **Stripe-konto** (virksomhed/CVR klarest til DK-udbetaling).
2. **RevenueCat-projekt**: entitlement-id `premium`; Web Billing-produkt
   349 kr/år m. 14 dages prøve (spejler `app/src/payments/config.ts`).
3. Web-aktivering: 4 punkter i `docs/env.md` §RevenueCat (én kodelinje +
   nøgle — paywallen og al gating er færdig).
4. Native IAP (efter web virker): App Store-produkt + RevenueCat
   Capacitor-plugin (`@revenuecat/purchases-capacitor`) — sig til, når du
   er her, det er et lille, veldefineret trin.

## 4. HealthKit (wearable-sync, premium)

Datalaget står klar (fase 3.2: `activity_days`/`body_metrics` m.
`source='healthkit'`). Aktivering kræver rigtig iPhone-test, derfor bevidst
ikke skrevet som blind kode:

- Plugin-kandidat: `@perfood/capacitor-healthkit` (læs skridt + aktiv energi
  + vægt); HealthKit-capability slås til i Xcode-projektet via workflowet.
- Flow: ved app-start på iOS læses dagens tal og upsertes i `activity_days`
  (samme kald som manuel indtastning — UI ændres ikke).
- Byg det sammen med mig i testperioden, når TestFlight kører.

## 5. App Store-indsendelse (sidste skridt)

- **Privacy nutrition labels:** Health & Fitness-data, indsamles, knyttes til
  bruger, bruges KUN til app-funktionalitet — aldrig tracking/reklame.
  (Matcher GDPR-teksten fra onboardingen.)
- **Aldersgrænse:** appen håndhæver selv 13+ (onboarding-gaten); vælg
  tilsvarende i App Store-spørgeskemaet.
- **Attribution:** Open Food Facts (ODbL) er krediteret i appen — nævn det
  også i beskrivelsen.
- **Support-URL + privatlivspolitik-URL** kræves — en simpel side på
  domænet er nok (sig til, så bygger jeg den).
- Review-noter: nævn at kontosletning findes i appen (Profil → Data &
  privatliv) — Apple tjekker det for konti-apps.

## Lokal udvikling (reference)

- `pnpm native:sync` — bygger web + synkroniserer til begge platforme.
- Genererede web-kopier/Pods er gitignoreret; platformprojekterne er
  committet. Ikoner/splash regenereres med
  `cd native && npx @capacitor/assets generate --ios --android`
  (kilderne ligger i `native/assets/`).
