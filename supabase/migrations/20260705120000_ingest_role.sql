-- Dedikeret ingestion-rolle (fase 1.1): kan KUN skrive referencedata
-- (foods, nutrient_references) — bevidst ikke service role.
-- Password sættes udenom git (ALTER ROLE ved provisionering).

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'ingest') then
    create role ingest login;
  end if;
end
$$;

grant usage on schema public to ingest;
grant select, insert, update on public.foods to ingest;
grant select, insert, update, delete on public.nutrient_references to ingest;

-- RLS-politikker for rollen (samme-migration-reglen).
create policy "foods_ingest_all" on public.foods
  for all to ingest using (true) with check (true);
create policy "nutrient_references_ingest_all" on public.nutrient_references
  for all to ingest using (true) with check (true);
