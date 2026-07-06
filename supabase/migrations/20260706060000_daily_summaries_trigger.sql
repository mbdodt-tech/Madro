-- Fase 1.7: daily_summaries genberegnes af en trigger på log_entries
-- (mekanisme afgjort 2026-07-06, se docs/schema.md). Formlerne spejler
-- @madro/core (sumNutrients/novaShare) — hold dem i sync med
-- packages/core/src/rollup/rollup.ts og nutrients/keys.ts.

-- ---------- 1. Brugerens tidszone afgør dagsgrænsen ----------
alter table public.profiles
  add column timezone text not null default 'Europe/Copenhagen';

-- ---------- 2. Lokal dag for et tidspunkt ----------
create or replace function public.madro_local_day(p_ts timestamptz, p_user uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (p_ts at time zone coalesce(
    (select timezone from public.profiles where id = p_user),
    'Europe/Copenhagen'
  ))::date;
$$;

-- ---------- 3. Fuld genberegning af én (user, day)-summary ----------
create or replace function public.recompute_daily_summary(p_user uuid, p_day date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Nøglelister spejler NUTRIENT_INFO i packages/core (micro-flaget).
  macro_keys text[] := array[
    'protein_g','carbohydrate_g','fat_g','sugars_g',
    'saturated_fat_g','fiber_g','salt_g','sodium_mg'
  ];
  v_totals jsonb;
  v_kcal numeric;
  v_nova numeric;
  v_count integer;
begin
  with day_entries as (
    select le.amount, f.nutriments, f.nova_group
    from public.log_entries le
    left join public.foods f on f.id = le.food_id
    where le.user_id = p_user
      and public.madro_local_day(le.consumed_at, p_user) = p_day
  ),
  totals as (
    select kv.key, sum(kv.value::numeric * de.amount / 100.0) as total
    from day_entries de,
         lateral jsonb_each_text(coalesce(de.nutriments, '{}'::jsonb)) kv
    where kv.value ~ '^-?[0-9.eE+-]+$'
    group by kv.key
  ),
  nova as (
    select
      sum(amount) filter (where nova_group between 1 and 3) as non_ultra,
      sum(amount) filter (where nova_group between 1 and 4) as known
    from day_entries
  )
  select
    (select count(*) from day_entries),
    coalesce((select jsonb_object_agg(key, round(total, 3)) from totals), '{}'::jsonb),
    (select round(total, 2) from totals where key = 'energy_kcal'),
    (select case when known > 0
       then round(coalesce(non_ultra, 0) / known * 100, 2) end
     from nova)
  into v_count, v_totals, v_kcal, v_nova;

  if v_count = 0 then
    delete from public.daily_summaries where user_id = p_user and day = p_day;
    return;
  end if;

  insert into public.daily_summaries (user_id, day, kcal, macros, micros, nova_share, computed_at)
  values (
    p_user,
    p_day,
    v_kcal,
    (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
     from jsonb_each(v_totals) where key = any(macro_keys)),
    (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
     from jsonb_each(v_totals) where key <> all(macro_keys) and key <> 'energy_kcal'),
    v_nova,
    now()
  )
  on conflict (user_id, day) do update set
    kcal = excluded.kcal,
    macros = excluded.macros,
    micros = excluded.micros,
    nova_share = excluded.nova_share,
    computed_at = excluded.computed_at;
end;
$$;

-- ---------- 4. Trigger på log_entries ----------
create or replace function public.log_entries_summary_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.recompute_daily_summary(
      new.user_id, public.madro_local_day(new.consumed_at, new.user_id));
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    -- Flyttes en post over en dagsgrænse (eller slettes), skal den
    -- gamle dag også genberegnes.
    if tg_op = 'DELETE'
       or old.user_id <> new.user_id
       or public.madro_local_day(old.consumed_at, old.user_id)
          <> public.madro_local_day(new.consumed_at, new.user_id) then
      perform public.recompute_daily_summary(
        old.user_id, public.madro_local_day(old.consumed_at, old.user_id));
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger log_entries_daily_summary
  after insert or update or delete on public.log_entries
  for each row execute function public.log_entries_summary_trigger();

-- ---------- 5. Backfill af eksisterende data ----------
do $$
declare r record;
begin
  for r in
    select distinct le.user_id, public.madro_local_day(le.consumed_at, le.user_id) as day
    from public.log_entries le
  loop
    perform public.recompute_daily_summary(r.user_id, r.day);
  end loop;
end $$;
