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

Kommer i Fase 0.6 (`functions/ai` — eneste indgang til Anthropic API). CORS-template er obligatorisk for alle funktioner.
