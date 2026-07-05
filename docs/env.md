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

## Kommer senere

- `ANTHROPIC_API_KEY` — kun i Edge Function secrets (Fase 0.6). Aldrig i klienten.
- Sentry DSN (0.7), RevenueCat-nøgler (Fase 4).
