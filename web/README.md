# Visceral web

React 19 + TypeScript explorer for population-level public-health burden. Data formats and organ column order are defined in `../contracts/README.md` and `../contracts/organs.json`.

## Run locally

```sh
npm run dev:fixture
```

This serves the synthetic contract fixture at `/fixture-data/` using development-only Vite middleware. No files are copied into `public/data/`. The app visibly labels fixture values as synthetic, not WHO estimates.

`npm run dev` reads pipeline output from `public/data/`. Override the data URL with `VITE_DATA_BASE` (include its trailing slash). Production builds use `/visceral/` as the GitHub Pages project base.

## Anatomy

The lazy scene loads `${BASE_URL}models/visceral.glb` directly through R3F's cached `useLoader`, Three's GLTFLoader and MeshoptDecoder. `src/scene/modelLoader.ts` configures the same loader/decoder for the scene and Node tests. There is no separate HEAD availability check. Missing or unreadable models fall back to `src/scene/PlaceholderBody.ts`, log the original error, and show a non-blocking notice. Set `VITE_ANATOMY=placeholder` to intentionally use the schematic without attempting a model load. Both sources use the same Object3D mesh-name adapter in `src/scene/anatomy.ts`; organ definitions remain authoritative. List-only and systemic groups are still fully selectable.

The lung surfaces are derived envelopes of BodyParts3D bronchial/vascular trees; bronchi are retained in the trachea node. See `../assets/README.md` for derivation and attribution. Skin is subtle neutral glass by default (3.5% opacity in dark mode, 5.5% in light); skeleton is neutral bone. Selecting either group or displaying its layer alone restores its data color. View commands explicitly invalidate the demand loop, including instant commands under reduced motion; animated transitions continue through drei's update events.

## Architecture

- `src/data/`: contract types, shared abortable JSON cache, loading hook and pure selectors.
- `src/state/`: Zustand selection/presentation state and validated two-way hash-query sync.
- `src/lib/colorScale.ts`: fixed or explicitly rescaled viridis display domain; logarithmic above a 50-fold positive range. Extreme positive domains clamp the display minimum to maximum ÷ 1,000, limiting rare tiny values' effect while keeping fixed colors comparable across filters. This deterministic rule needs no extra shards or pipeline changes. Lower values retain their actual printed numbers and share the lowest color. The legend explains the floor and uses positioned, rounded log ticks that never turn tiny positives into zero labels.
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

Tests use jsdom or Node and never require a WebGL context. They decode the shipped Meshopt GLB, run contract validation, indexing, material cloning, layer updates and outline preparation, and mount the actual model under StrictMode with a mocked renderer. Real camera movement from idle demand rendering is checked with normal and reduced motion, including focus, three zoom clicks, rotation and reset. HTML view-button routing, theme-specific shell materials, derived lung volume, scene transforms, limb coverage, fixture selectors, URL sync, color domains, cache cancellation and keyboard/list/filter interactions are covered. A browser is still required for visual layout and WebGL device QA.

The header uses the supplied transparent brand icon next to live text. Favicon, Apple touch icon and `site.webmanifest` use the same icon family. Paths respect Vite's production base; the purple raster wordmark is deliberately unused on dark backgrounds.
