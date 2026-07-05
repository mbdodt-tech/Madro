# Supabase

Projekt: **Madro** — ref `rtkktiywjcwglwzebchx`, region `eu-central-1` (EU-krav, jf. GDPR-afsnittet i CLAUDE.md).

## Migrationer

`migrations/*.sql` er kilden til sandheden. De anvendes p.t. via Supabase MCP-forbindelsen (`apply_migration`, spores i `supabase_migrations.schema_migrations` på projektet), da denne maskine ikke har Docker/Supabase CLI.

Når CLI'en tages i brug (fx i CI):

```
supabase link --project-ref rtkktiywjcwglwzebchx
supabase db push          # anvender manglende migrationer
supabase db diff -f <navn> # generér ny migration efter skemaændringer
```

**Regler (CLAUDE.md):** aldrig skemaændringer uden migrationsfil; nye tabeller får RLS-politikker i samme migration; buckets oprettes i migration/seed.

## Efter hver migration

1. Regenerér typer → `packages/core/src/database.types.ts`.
2. Kør security advisors og håndtér fund.
3. Opdatér `docs/schema.md`.

## Edge Functions

`functions/ai` er **eneste indgang til Anthropic API** (CLAUDE.md-regel). Pipeline: CORS-preflight → auth (`getUser`) → zod-envelope `{ task, payload }` → rate-limit (20/min pr. bruger via `ai_requests`) → task-handler. Klienten kalder den via `callAi` fra `@madro/core` (`app/src/lib/ai.ts`).

**Regler for alle nye funktioner:**
- Brug altid `_shared/cors.ts` (OPTIONS-preflight + origin-allowlist). Tilføj nye domæner dér.
- Log aldrig payload-indhold — kun task-navn, bruger-id og udfald (GDPR).
- Anthropic-kald går gennem `_shared/anthropic.ts` (guardrails + JSON-validering). Kræver `ANTHROPIC_API_KEY` som secret (se `docs/env.md`).

Deploy sker p.t. via MCP (`deploy_edge_function` med filerne `ai/index.ts` + `_shared/*`; `verify_jwt=false`, fordi funktionen selv auth'er og preflight skal virke). Med CLI: `supabase functions deploy ai --no-verify-jwt`.
