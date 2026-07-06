-- Fase 3.1: højde/vægt på profilen — grundlag for rigtige behovsberegninger
-- (Mifflin-St Jeor i @madro/core). RLS-politikkerne på profiles dækker
-- allerede kolonnerne (egen række); ingen nye politikker nødvendige.

alter table public.profiles
  add column if not exists height_cm numeric(5, 1)
    check (height_cm is null or (height_cm >= 100 and height_cm <= 250)),
  add column if not exists weight_kg numeric(5, 1)
    check (weight_kg is null or (weight_kg >= 30 and weight_kg <= 300));

comment on column public.profiles.height_cm is
  'Højde i cm (frivillig; bruges kun til energiberegning).';
comment on column public.profiles.weight_kg is
  'Seneste vægt i kg (frivillig; spejles fra body_metrics ved vægtlog, fase 3.2).';
