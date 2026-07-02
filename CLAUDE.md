# CLAUDE.md

## Project

Nutrition & food-quality app: combines product scanning (NOVA classification, additives, Nutri-Score via Open Food Facts) with full macro- and micronutrient tracking (USDA FoodData Central, Frida/DTU) in **one unified user profile**. Commercial product. Design quality is the top priority. The full build plan lives in `docs/byggeplan.md` — always consult the relevant section before starting a phase or feature.

Fridge-photo → recipe is explicitly **out of scope** until after launch. Do not build it.

## Monorepo layout

```
app/            React + Vite + TypeScript web app (PWA)
packages/ui     Design system: tokens, components (shared)
packages/core   Pure logic: nutrient math, rollups, types, verdict scoring
supabase/       Migrations, seed scripts, Edge Functions (Deno)
scripts/        Data ingestion (OFF dump, USDA, Frida)
docs/           byggeplan.md, ADRs, this project's decisions
native/         Capacitor shell (added in Fase 5 — do not create earlier)
```

Package manager: **pnpm** with workspaces. Node 20+.

## Commands

- `pnpm dev` — run web app locally
- `pnpm build` — production build
- `pnpm test` — Vitest unit tests (always run after changing `packages/core`)
- `pnpm lint` / `pnpm typecheck` — must pass before any commit
- `supabase db diff -f <name>` — generate migration after schema changes; never edit the DB without a migration file
- `supabase functions serve` — run Edge Functions locally

## Tech stack (fixed decisions — do not substitute)

React 18 + Vite + TypeScript (strict). Tailwind CSS. Radix UI primitives. Framer Motion (`motion`) for ALL animation. TanStack Query for server state. Zustand for light client state. react-i18next. Recharts for standard charts; custom SVG for signature visuals (quality arc, macro rings, micro strip). Supabase (Postgres, Auth, Storage, RLS). Deno Edge Functions. Anthropic API (server-side only). RevenueCat for entitlements. Capacitor for native (Fase 5). Vercel hosting. Sentry.

## Design system rules (highest priority)

- **Tokens only.** All colors, spacing, radii, and type come from the Tailwind theme defined in `packages/ui/tokens`. Never hardcode a hex value, px spacing, or font-family in a component. If a needed token doesn't exist, add it to the theme first.
- Fonts: **Geist Sans** (UI) and **Geist Mono** (all numeric data — with `tabular-nums`). No other fonts.
- Palette: evergreen brand (`#0E7A5E` light / `#35C495` dark), warm off-white bg (`#FBFBF9`), muted verdict scale (see tokens). Dark mode is first-class: every component must be checked in both modes before it is done.
- Motion: Framer Motion only. Springs (stiffness ~300, damping ~30) for interaction; 180–260 ms; shared-element (`layoutId`) transitions from scan result → detail. No hard cuts, no CSS-only ad-hoc animations.
- Radius scale: 10/14/18/24/pill. 4-pt spacing grid.
- Respect `prefers-reduced-motion`.
- Accessibility: WCAG AA contrast, keyboard + screen-reader support via Radix, all icons labelled.

## Supabase rules (known gotchas — do not skip)

- **RLS is enabled on every table** and every new table gets policies in the same migration. Default: user can only read/write rows where `user_id = auth.uid()`. Reference tables (`foods`, `nutrient_references`) are read-only for authenticated users.
- **Storage:** user uploads (meal photos) go in a **private** bucket accessed via **signed URLs**; product images may be public. **Pre-create all buckets in a migration/seed script** — never assume a bucket exists at runtime.
- **Edge Functions: always include CORS headers** (including the OPTIONS preflight handler) on every function. This has bitten us before; make it part of the function template.
- Never expose the service-role key to the client. Client uses anon key + RLS only.

## AI rules

- All Anthropic API calls go through the single gateway Edge Function (`supabase/functions/ai`). **Never call the API from the client.** The key lives only in Edge Function secrets.
- Structured outputs: prompt for JSON only, strip ``` fences, parse in try/catch, validate with zod before use.
- Tone guardrails baked into every prompt: neutral, supportive, non-judgemental; never use "farlig"/"dangerous"; never give individual medical advice or diagnoses; reference named systems (NOVA, Nutri-Score, EFSA) rather than inventing our own verdicts.

## Payments

- Feature gating goes through `useEntitlements()` (wraps RevenueCat) — **no component ever checks Stripe, StoreKit, or plan names directly.**
- Free tier must remain genuinely usable: barcode scan, verdict, basic diary, today view. Premium: deep micronutrients, weekly insights, photo logging, NL logging, alternatives, wearables, export.

## i18n

- **No hardcoded user-facing strings.** Every string is a key via react-i18next. English (`en`) is the source locale; Danish (`da`) is the first full translation and the beta language. Add both when adding a key.
- Locale also drives number/date formatting and the RDA/NRV reference set (EU vs US vs DK).

## Data rules

- `foods` rows always carry `source` (`off` | `usda` | `frida` | `custom`) and `data_quality` (`verified` | `crowdsourced` | `user`). UI shows this transparently.
- OFF data is served from **our own cached table** (nightly dump ingestion), never live-fetched per scan. Attribute Open Food Facts in the UI (ODbL requirement).
- Prefer verified sources (USDA/Frida) for whole foods; OFF for barcoded packaged goods.
- Calculations (macro/micro rollups, NOVA share, verdict score) live in `packages/core` with unit tests — never inline in components.

## Responsible design (non-negotiable)

- The `hide_calories` profile setting must be respected by **every** surface that would show a calorie number.
- No guilt mechanics: no red "over budget" shaming, no streak-loss punishment, no "good/bad food" language.
- Age gate at onboarding. Support-resource link (LMS in Denmark) reachable from settings.
- Copy tone: sentence case, plain, warm, never moralising.

## Privacy (GDPR)

- Diet data is treated as sensitive health data: data minimisation, explicit consent at onboarding, user-facing export and delete-account flows are core features (Fase 4), EU region for Supabase project.
- Never log request bodies containing user diet data in Edge Functions.

## Git workflow

- Small, focused commits with conventional-commit messages (`feat:`, `fix:`, `chore:`, `design:`).
- `pnpm lint && pnpm typecheck && pnpm test` must pass before committing.
- One phase-step (from `docs/fase-tjekliste.md`) per branch/PR where practical.

## When unsure

Prefer asking over guessing on: schema changes, new dependencies, anything touching payments/entitlements, anything touching AI prompts, and any deviation from `docs/byggeplan.md`.
