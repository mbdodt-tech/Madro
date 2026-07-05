# Miljøvariabler

Udbygges i Fase 0.7 (Vercel/CI). Indtil da:

## app/ (Vite — kun offentlige nøgler!)

| Variabel | Hvad | Hvor |
|---|---|---|
| `VITE_SUPABASE_URL` | Projektets API-URL (`https://rtkktiywjcwglwzebchx.supabase.co`) | `app/.env.local` (gitignoret), Vercel env |
| `VITE_SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_…`). Kun RLS-beskyttet adgang — aldrig service role i klienten | samme |

## Manuelle dashboard-trin (kan ikke sættes via MCP)

- **Auth → URL Configuration**: Site URL + redirect-allowlist skal indeholde `http://localhost:5173` (dev) og Vercel-domænerne (0.7), før magic link-links kan følges. Password-login virker uden.
- SMTP er Supabase's indbyggede (rate-begrænset, fint til beta) — egen SMTP overvejes før launch.

## Edge Function secrets (dashboard → Edge Functions → Secrets)

| Secret | Hvad | Status |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API-nøgle — bruges KUN af `functions/ai` via `_shared/anthropic.ts`. Aldrig i klienten, aldrig i git. | **Manuelt trin: skal sættes i dashboardet, før Fase 2-tasks kan kalde modellen.** `ping`-tasken virker uden. |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Injiceres automatisk af platformen | ok |

## Kommer senere

- Sentry DSN (0.7), RevenueCat-nøgler (Fase 4).
