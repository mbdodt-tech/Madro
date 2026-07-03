# Madro

Nutrition & food-quality app: product scanning (NOVA, additives, Nutri-Score via Open Food Facts) combined with full macro- and micronutrient tracking (USDA FoodData Central, Frida/DTU) in one unified profile.

The full build plan lives in [docs/byggeplan.md](docs/byggeplan.md); the step-by-step checklist in [docs/fase-tjekliste.md](docs/fase-tjekliste.md). The approved visual design mockup is in [docs/design/mockup/](docs/design/mockup/).

## Monorepo

pnpm workspaces, Node 20+.

| Path | Contents |
|---|---|
| `app/` | React + Vite + TypeScript web app (PWA) |
| `packages/ui` | Design system: tokens, components |
| `packages/core` | Pure logic: nutrient math, rollups, types, scoring |
| `supabase/` | Migrations, seed scripts, Edge Functions |
| `scripts/` | Data ingestion (OFF, USDA, Frida) |
| `docs/` | Build plan, decisions, design mockup |

## Commands

```
pnpm install
pnpm dev         # run web app locally
pnpm build       # production build
pnpm test        # unit tests (Vitest)
pnpm lint        # ESLint
pnpm typecheck   # tsc --noEmit across packages
```

`pnpm lint && pnpm typecheck && pnpm test` must pass before any commit.
