-- Fase 4.1: onboarding-flowets to tidsstempler.
-- consent_at dokumenterer det eksplicitte GDPR-samtykke (påviselighed);
-- onboarded_at markerer gennemført onboarding (aldersgate + samtykke).
-- RLS: profiles' egne-række-politikker dækker allerede kolonnerne.

alter table public.profiles
  add column if not exists consent_at timestamptz,
  add column if not exists onboarded_at timestamptz;

comment on column public.profiles.consent_at is
  'Tidspunkt for eksplicit samtykke til behandling af kostdata (GDPR).';
comment on column public.profiles.onboarded_at is
  'Onboarding gennemført (aldersgate + samtykke); null = vis flowet.';
