-- Fase 3.2: aktivitets-/kropsdatalag — wearable-fundamentet.
-- 'source' er provider-nøglen: 'manual' nu; HealthKit m.fl. (Fase 5)
-- skriver i de samme tabeller uden ombygning.

create table public.body_metrics (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  weight_kg numeric(5, 1) not null
    check (weight_kg >= 30 and weight_kg <= 300),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table public.activity_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  steps integer check (steps is null or (steps >= 0 and steps <= 200000)),
  active_kcal numeric(6, 1)
    check (active_kcal is null or (active_kcal >= 0 and active_kcal <= 5000)),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- RLS: alle operationer kun på egne rækker (samme mønster som log_entries).
alter table public.body_metrics enable row level security;
alter table public.activity_days enable row level security;

create policy body_metrics_select_own on public.body_metrics
  for select using (auth.uid() = user_id);
create policy body_metrics_insert_own on public.body_metrics
  for insert with check (auth.uid() = user_id);
create policy body_metrics_update_own on public.body_metrics
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy body_metrics_delete_own on public.body_metrics
  for delete using (auth.uid() = user_id);

create policy activity_days_select_own on public.activity_days
  for select using (auth.uid() = user_id);
create policy activity_days_insert_own on public.activity_days
  for insert with check (auth.uid() = user_id);
create policy activity_days_update_own on public.activity_days
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy activity_days_delete_own on public.activity_days
  for delete using (auth.uid() = user_id);
