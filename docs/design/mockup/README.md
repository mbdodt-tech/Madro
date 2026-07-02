# Madro — visuelt designoplæg

Klikbart oplæg af **"I dag"-skærmen** og **scan-flowet** (byggeplan §12, mulighed 1). Selvstændig HTML/CSS/JS — ingen build. Åbn `index.html` direkte i en browser, eller på telefon via en simpel statisk server.

## Hvad kan det

- **I dag**: kvalitetsbue, kalorielinje med skjul-toggle (`hide_calories`), tre makroringe med animeret optælling, mikronæringsstribe (tryk for fuld liste sorteret efter laveste dækning), indsigtsteaser, måltidslog.
- **Scan-flow**: Scan-knap → mock-kamera → resultat-ark med VerdiktBadge, NOVA/Nutri-Score/additiv-chips og OFF-attribution → "Jeg spiste det" → portionsvælger → logning: ringe og bue animerer, snack-rækken lander i loggen.
- **Produktdetalje**: tryk på produkthovedet i arket → arket udvider sig til fuld detaljeside (delt-element-fornemmelsen).
- **Tema**: lys/mørk/system øverst på siden + toggle i app-headeren. Mørk tilstand er fuldt udført.
- **Reduceret bevægelse**: alle animationer slås fra ved `prefers-reduced-motion`.

## Tokens

Alle værdier i `styles.css` `:root`/`[data-theme="dark"]` er en 1:1-gengivelse af byggeplan §3 og skal løftes ind i `packages/ui`-temaet i Fase 0.2.

**Foreslåede NYE tokens** (findes ikke i §3.2 — skal godkendes):

| Token | Lys | Mørk | Brug |
|---|---|---|---|
| `--macro-protein` | `#0E7A5E` (brand) | `#35C495` | Proteinring |
| `--macro-carb` | `#E8A13A` (accent) | `#E8B05C` | Kulhydratring |
| `--macro-fat` | `#6E87A8` (ny: afdæmpet skiferblå) | `#8FA9C9` | Fedtring |

## Foreløbigt

- Mikrostribens 8 stoffer (D, jern, magnesium, calcium, kalium, B12, folat, zink) er et forslag — se `docs/open-questions.md`.
- Geist-fontene ligger self-hostet i `fonts/` (variable woff2 fra Fontsource, latin subset).
