# Visceral web

React 19 + TypeScript explorer for population-level public-health burden. Data formats and organ column order are defined in `../contracts/README.md` and `../contracts/organs.json`.

## Run locally

```sh
npm run dev:fixture
```

This serves the synthetic contract fixture at `/fixture-data/` using development-only Vite middleware. No files are copied into `public/data/`. The app visibly labels fixture values as synthetic, not WHO estimates.

`npm run dev` reads pipeline output from `public/data/`. Override the data URL with `VITE_DATA_BASE` (include its trailing slash). Production builds use `/visceral/` as the GitHub Pages project base.

## Anatomy

The lazy scene checks `${BASE_URL}models/visceral.glb` and loads it with `useGLTF` and MeshoptDecoder. Missing or unreadable models fall back to `src/scene/PlaceholderBody.ts`, a schematic Y-up, metre-scale body. Set `VITE_ANATOMY=placeholder` to skip the model check. Both sources use the same Object3D mesh-name adapter in `src/scene/anatomy.ts`; organ definitions remain authoritative. List-only and systemic groups are still fully selectable.

## Architecture

- `src/data/`: contract types, shared abortable JSON cache, loading hook and pure selectors.
- `src/state/`: Zustand selection/presentation state and validated two-way hash-query sync.
- `src/lib/colorScale.ts`: fixed or explicitly rescaled viridis domain; logarithmic above a 50-fold positive range.
- `src/components/`: filters, keyboard organ list, detail panel and lazy charts with HTML table alternatives.
- `src/scene/`: lazy demand-rendered anatomy, selection outline, picking and camera controls.
- `src/content/organs.ts`: neutral descriptions without statistics.

Missing values remain `null`; zero is displayed as zero. Leading causes are only available for All ages. The contract supplies count and crude rate, so age-standardized views explicitly label cause breakdowns as totals. Hover uses refs and direct Three/DOM updates, outside React state.

## Checks

```sh
npm test
npm run lint
npm run build
# From the repository root:
bash scripts/check.sh
```

Tests use jsdom and never render WebGL. Scene indexing/material independence, fixture selectors, URL sync, color domains, cache cancellation and keyboard/list/filter interactions are covered. A browser is still required for visual layout and WebGL device QA.
