# Miljøvariabler og drift

## Hosting

| Hvad | Hvor |
|---|---|
| Produktion | https://madro.vercel.app (Vercel-projekt `madro`, team `michael-brodsgaard-dodts-projects`) |
| Auto-deploy | GitHub-repoet er koblet til Vercel: push til `main` → produktion; PR'er → preview-URL'er |
| Build-konfig | Rod-`vercel.json` (deploy fra repo-rod: `pnpm build` → `app/dist`, SPA-rewrites, cache-headers). `app/vercel.json` bruges kun, hvis projektets Root Directory sættes til `app`. |
| CI | `.github/workflows/ci.yml`: lint + typecheck + test + build på push/PR |

## app/ (Vite — kun offentlige værdier!)

| Variabel | Hvad | Hvor |
|---|---|---|
| `VITE_SUPABASE_URL` | Projektets API-URL (`https://rtkktiywjcwglwzebchx.supabase.co`) | `app/.env.local` (dev) + `app/.env.production` (committed — offentlig værdi) |
| `VITE_SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_…`). Kun RLS-beskyttet adgang — aldrig service role i klienten | samme |
| `VITE_SENTRY_DSN` | Sentry DSN — Sentry er slået fra, når den mangler. Ingen kostdata/PII sendes (se `app/src/lib/sentry.ts`) | Vercel env (sættes når Sentry-projektet oprettes) |

## Edge Function secrets (dashboard → Edge Functions → Secrets)

| Secret | Hvad | Status |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API-nøgle — bruges KUN af `functions/ai` via `_shared/anthropic.ts`. Aldrig i klienten, aldrig i git. | **Manuelt trin: skal sættes i dashboardet, før Fase 2-tasks kan kalde modellen.** `ping`-tasken virker uden. |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Injiceres automatisk af platformen | ok |

## Manuelle trin, der udestår

- **Supabase Auth → URL Configuration**: Site URL = `https://madro.vercel.app`; redirect-allowlist skal indeholde `http://localhost:5173` og `https://madro.vercel.app` (+ `https://*-michael-brodsgaard-dodts-projects.vercel.app` for previews), før magic link-links kan følges. Password-login virker uden.
- **GitHub branch protection** på `main` med CI-checket som required — gør røde builds formelt blokerende (kræver GitHub-UI eller `gh auth login`).
- **Sentry-projekt** oprettes → DSN ind i Vercel env som `VITE_SENTRY_DSN`.
- SMTP er Supabase's indbyggede (rate-begrænset, fint til beta) — egen SMTP overvejes før launch.

## Kommer senere

- RevenueCat-nøgler (Fase 4). PostHog-beslutning udestår (se `docs/open-questions.md`).


## E2E-tests (fase 1.8)

Playwright-kerneløkke-tests i `app/e2e/` mod en prod-preview (port 4173).

- **Lokalt:** `pnpm e2e` (kræver gitignoret `app/.env.e2e` med `E2E_EMAIL`/`E2E_PASSWORD`
  for den permanente testbruger `madro-e2e@madro.test`).
- **CI:** `e2e`-jobbet i `.github/workflows/ci.yml` kører kun når repo-variablen
  `E2E_ENABLED=true` og secret `E2E_PASSWORD` er sat. **Aktiveres manuelt:**

  ```
  gh variable set E2E_ENABLED --body true
  grep E2E_PASSWORD app/.env.e2e | cut -d= -f2 | gh secret set E2E_PASSWORD
  ```

- Windows-gotcha: `vite preview` kan efterlade en orphan på port 4173 — dræb den,
  ellers genbruger Playwright en forældet bygning (`reuseExistingServer`).
