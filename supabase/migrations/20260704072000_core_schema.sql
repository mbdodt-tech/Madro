-- Madro kerneskema (fase-tjekliste 0.4, byggeplan §5.2)
-- Regler: RLS aktiveres på ALLE tabeller i samme migration.
-- Brugertabeller er låst til auth.uid(); referencetabeller er
-- read-only for authenticated. Buckets pre-oprettes her.

-- ---------- Extensions ----------
create extension if not exists pg_trgm with schema extensions;

-- ---------- Hjælpere ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  locale text not null default 'da',
  hide_calories boolean not null default false,
  sex text check (sex in ('male', 'female', 'other')),
  birth_year integer check (birth_year between 1900 and 2100),
  activity_level text check (
    activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  goals jsonb not null default '{}'::jsonb,
  dietary_preferences text[] not null default '{}',
  rda_region text not null default 'DK' check (rda_region in ('DK', 'EU', 'US')),
  entitlement text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- Ingen delete-politik: kontosletning er et Fase 4-flow (cascade fra auth.users).

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- foods (reference + brugerdefinerede) ----------
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('off', 'usda', 'frida', 'custom')),
  data_quality text not null check (data_quality in ('verified', 'crowdsourced', 'user')),
  barcode text,
  name text not null,
  brand text,
  categories text[] not null default '{}',
  nova_group smallint check (nova_group between 1 and 4),
  nutriscore text check (nutriscore in ('a', 'b', 'c', 'd', 'e')),
  additives text[] not null default '{}',
  ingredients_text text,
  allergens text[] not null default '{}',
  nutriments jsonb not null default '{}'::jsonb,
  image_url text,
  source_ref text,
  owner_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index foods_barcode_idx on public.foods (barcode) where barcode is not null;
create unique index foods_source_source_ref_key on public.foods (source, source_ref)
  where source_ref is not null;
create index foods_name_trgm_idx on public.foods
  using gin (name extensions.gin_trgm_ops);

alter table public.foods enable row level security;

-- Alle indloggede kan læse fødevarer (referencedata).
create policy "foods_select_authenticated" on public.foods
  for select to authenticated using (true);
-- Brugere må kun skrive egne custom-fødevarer. Ingestion kører via service role.
create policy "foods_insert_own_custom" on public.foods
  for insert to authenticated
  with check (source = 'custom' and data_quality = 'user' and owner_id = (select auth.uid()));
create policy "foods_update_own_custom" on public.foods
  for update to authenticated
  using (source = 'custom' and owner_id = (select auth.uid()))
  with check (source = 'custom' and data_quality = 'user' and owner_id = (select auth.uid()));
create policy "foods_delete_own_custom" on public.foods
  for delete to authenticated
  using (source = 'custom' and owner_id = (select auth.uid()));

create trigger foods_set_updated_at
  before update on public.foods
  for each row execute function public.set_updated_at();

-- ---------- scans ----------
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null default 'barcode' check (type in ('barcode', 'photo')),
  barcode text,
  food_id uuid references public.foods (id) on delete set null,
  outcome text not null default 'checked' check (outcome in ('checked', 'logged')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index scans_user_created_idx on public.scans (user_id, created_at desc);

alter table public.scans enable row level security;

create policy "scans_select_own" on public.scans
  for select to authenticated using (user_id = (select auth.uid()));
create policy "scans_insert_own" on public.scans
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "scans_update_own" on public.scans
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "scans_delete_own" on public.scans
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- log_entries ----------
create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  amount numeric(10, 2) not null check (amount > 0),
  unit text not null default 'g',
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  consumed_at timestamptz not null default now(),
  scan_id uuid references public.scans (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index log_entries_user_consumed_idx
  on public.log_entries (user_id, consumed_at desc);

alter table public.log_entries enable row level security;

create policy "log_entries_select_own" on public.log_entries
  for select to authenticated using (user_id = (select auth.uid()));
create policy "log_entries_insert_own" on public.log_entries
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "log_entries_update_own" on public.log_entries
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "log_entries_delete_own" on public.log_entries
  for delete to authenticated using (user_id = (select auth.uid()));

create trigger log_entries_set_updated_at
  before update on public.log_entries
  for each row execute function public.set_updated_at();

-- ---------- daily_summaries ----------
create table public.daily_summaries (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kcal numeric(10, 2),
  macros jsonb not null default '{}'::jsonb,
  micros jsonb not null default '{}'::jsonb,
  nova_share numeric(5, 2),
  computed_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.daily_summaries enable row level security;

create policy "daily_summaries_select_own" on public.daily_summaries
  for select to authenticated using (user_id = (select auth.uid()));
create policy "daily_summaries_insert_own" on public.daily_summaries
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "daily_summaries_update_own" on public.daily_summaries
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "daily_summaries_delete_own" on public.daily_summaries
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- insights ----------
create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'weekly',
  period_start date not null,
  period_end date not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index insights_user_period_idx on public.insights (user_id, period_start desc);

alter table public.insights enable row level security;

create policy "insights_select_own" on public.insights
  for select to authenticated using (user_id = (select auth.uid()));
create policy "insights_insert_own" on public.insights
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "insights_delete_own" on public.insights
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- recommendations ----------
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scan_id uuid references public.scans (id) on delete set null,
  day date,
  items jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index recommendations_user_idx on public.recommendations (user_id, created_at desc);

alter table public.recommendations enable row level security;

create policy "recommendations_select_own" on public.recommendations
  for select to authenticated using (user_id = (select auth.uid()));
create policy "recommendations_insert_own" on public.recommendations
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "recommendations_delete_own" on public.recommendations
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- nutrient_references (referencetabel, read-only) ----------
create table public.nutrient_references (
  id uuid primary key default gen_random_uuid(),
  nutrient_key text not null,
  unit text not null,
  region text not null check (region in ('DK', 'EU', 'US')),
  sex text not null default 'any' check (sex in ('male', 'female', 'any')),
  age_min integer not null default 0 check (age_min >= 0),
  age_max integer not null default 150 check (age_max >= 0),
  rda numeric(12, 4),
  ul numeric(12, 4),
  source text not null,
  unique (nutrient_key, region, sex, age_min)
);

alter table public.nutrient_references enable row level security;

-- Read-only for indloggede; skrivning kun via service role (ingestion).
create policy "nutrient_references_select_authenticated" on public.nutrient_references
  for select to authenticated using (true);

-- ---------- Storage-buckets (pre-oprettes — aldrig antaget at eksistere) ----------
insert into storage.buckets (id, name, public)
values
  ('meal-photos', 'meal-photos', false),
  ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- meal-photos: privat; brugere må kun tilgå egne filer (mappe = auth.uid()).
create policy "meal_photos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "meal_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "meal_photos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "meal_photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- product-images: offentlig læsning via bucket-flaget; skrivning kun via service role.
