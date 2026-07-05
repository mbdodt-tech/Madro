-- Rate-begrænsning for AI-gatewayen (fase-tjekliste 0.6).
-- Kun service role skriver/læser: RLS er aktiveret UDEN politikker,
-- så klienter har ingen adgang (reglen om RLS i samme migration).

create table public.ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  task text not null,
  created_at timestamptz not null default now()
);

create index ai_requests_user_created_idx
  on public.ai_requests (user_id, created_at desc);

alter table public.ai_requests enable row level security;
-- Ingen politikker med vilje: tabellen er utilgængelig for anon/authenticated.
