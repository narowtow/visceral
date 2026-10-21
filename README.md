<img src="web/public/brand/icon-192.png" alt="Visceral logo" width="56" height="56">

# Visceral

Explore how age structure, sex and analytical choices change the apparent distribution of disease burden across the body, through a reproducible WHO data pipeline and an interactive 3D explorer.

[![CI](https://github.com/narowtow/visceral/actions/workflows/ci.yml/badge.svg)](https://github.com/narowtow/visceral/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<!-- DEMO STATUS: replace the next line with the commented ready line after deployment. -->
[**Live demo**](https://narowtow.github.io/visceral/) *(coming soon)* · [**Analysis write-up**](docs/analysis.md) · [**Notebooks**](pipeline/notebooks/)
<!-- READY: [**Live demo**](https://narowtow.github.io/visceral/) · [**Analysis write-up**](docs/analysis.md) · [**Notebooks**](pipeline/notebooks/) -->

![Visceral explorer showing the 3D body, country and burden filters, organ list and selected-organ details; screenshot coming soon.](docs/screenshots/explorer.png)

<!-- Reserved screenshots; uncomment after capture:
![Selected-organ panel with burden rates, trends and mapped causes.](docs/screenshots/organ-panel.png)
![Mobile explorer with filters and the accessible organ browser.](docs/screenshots/mobile.png)
-->

## The question & key findings

**How do age structure, sex and method choices change where in the body the global burden of disease appears to fall?**

The data cover deaths and DALYs (disability-adjusted life years), attributed to organ and systemic groups. Age-standardized rates (ASDRs) compare populations using a common age distribution; they are not measures of organ health.

- **Age adjustment can reverse a country comparison.** In 2023, both sexes, Japan's heart death rate changes from **189.9 crude to 82.0 age-standardized** per 100,000, while Nigeria's changes from **57.9 to 339.3**. Their ranks among 185 countries move from **43 → 180** and **152 → 46**, respectively, with the highest burden ranked first.
- **Long-term declines and the pandemic tell different stories.** Global death ASDR fell **18.5% for heart, 17.0% for brain and 25.7% for lungs** between 2000 and 2019. Lung ASDR in 2021 was **83.7% above 2019**. COVID-19 accounts arithmetically for **109.6% of that net increase** because other mapped lung causes declined; this is additive accounting, not a causal estimate. These global rates use the broad-bin method.
- **Broad age bins introduce measurable differences.** Against WHO's fine-age country death ASDRs, the seven-bin approximation gives median differences of about **−15% for brain and −14% for heart** across countries in 2023, both sexes. Production country death ASDRs therefore use WHO's published cause rates; the approximation remains explicit for DALYs and World.
- **The standard population can change which group leads.** Holding the broad-bin method fixed, WHO2026 ranks **heart first, lungs second** for global death ASDR in 2023; Segi ranks **lungs first, heart second**. The apparent body profile depends on a stated analytical choice.

![Heart and brain country death rates before and after age standardization, colored by population share aged 70+.](docs/figures/age-rankings.png)

![Global heart, brain and lung death and DALY ASDRs at eight observed time points, including the 2020–2021 lung spike.](docs/figures/global-trends.png)

See the [write-up](docs/analysis.md) for methods, sex contrasts and limitations, or the [executed notebooks](pipeline/notebooks/) for the underlying tables and code.

## What I built

**A data pipeline with checks at each stage:** parse WHO workbooks → validate tidy tables → map causes → standardize and aggregate → export contract JSON.

- **Scale and reconciliation:** **15,486,720 observations**, 185 countries, 218 cause codes and eight observed years. Across **950,160 cause-level comparisons**, count-derived crude death rates match WHO's published rates to a maximum absolute difference of **5.23 × 10⁻¹² per 100,000**. Published primary-cause ASDR sums reconcile with All Causes within tolerance in **4,421 of 4,440 cases**; the remaining 19 match pinned WHO-file inconsistencies. Unknown or changed discrepancies fail validation. [Full validation report](pipeline/reports/validation.md).
- **An explicit cause-to-organ policy:** 95 primary cause nodes partition the hierarchy across 31 groups. Each leaf is covered once, with no parent/child double counting. The CSV retains every cause and a rationale; systemic and unallocated groups remain visible. This attributes underlying-cause burden, not every organ affected by a disease. [Mapping](pipeline/config/cause_map.csv).
- **Reusable analysis:** Spearman rank comparisons, observed-period changes, sex ratios, PCA and k-means with bootstrap adjusted Rand index (ARI), Ward clustering comparisons, and sensitivity to age bins, five standard populations and an alternative mapping. The selected two-cluster solution has median bootstrap ARI **0.936**, but Ward agreement is only **0.396**—a reason to treat clusters as descriptive patterns. [Analysis code](pipeline/src/visceral_pipeline/analysis/).
- **A web explorer:** React and React Three Fiber render the real BodyParts3D anatomy, built with Blender and compressed to a **1.1 MB GLB** (1,131,696 bytes; 26 mesh nodes). Filters expose country, sex, age, year and measure; a keyboard-accessible HTML organ list, chart tables, view buttons and reduced-motion handling provide alternatives to canvas interaction. Tests decode the shipped model and exercise scene behavior without requiring WebGL.

## Architecture

```mermaid
flowchart LR
    WHO["WHO GHE workbooks"] --> PIPE["Python pipeline: parse, validate, map, standardize"]
    CONFIG["Cause mapping and standard populations"] --> PIPE
    PIPE --> JSON["Contract JSON: web/public/data"]
    JSON --> WEB["React + React Three Fiber explorer"]
    PIPE --> ANALYSIS["Analysis tables, notebooks and figures"]
    BP3D["BodyParts3D sources"] --> BLENDER["Blender anatomy build"]
    BLENDER --> GLB["Meshopt-compressed GLB"]
    GLB --> WEB
```

The [contract](contracts/README.md) fixes identifiers, organ-array order, units and missing-value semantics. Missing data is `null`, distinct from zero. World counts and populations are summed before calculating rates; country rates are never averaged.

## Tech stack

| Area | Tools and purpose |
|---|---|
| Data engineering | Python 3.14, uv, openpyxl, pandas; DuckDB SQL for aggregation and Parquet |
| Validation | Pandera schemas, explicit reconciliation checks, SHA-256 source fingerprints |
| Analysis | NumPy, pandas, scikit-learn, matplotlib, Jupyter notebooks |
| Web | TypeScript, React 19, Vite, React Three Fiber, Three.js, drei, Zustand, Recharts, Tailwind CSS |
| Anatomy | Blender, BodyParts3D, glTF Transform and Meshopt compression |
| Quality & delivery | pytest, Ruff, Vitest, Testing Library, oxlint, GitHub Actions; GitHub Pages deployment workflow |

## Run it locally

Use **Node.js 24**, **Python 3.14+** and [uv](https://docs.astral.sh/uv/). The checked-in derived JSON and GLB let you run the explorer without rebuilding the pipeline or anatomy.

### Web

From the repository root, in PowerShell or a macOS/Linux shell:

```sh
cd web
npm ci
npm run dev
```

Open the local URL printed by Vite. `npm test` runs Vitest once; `npm run build` creates the production site, and `npm run preview` serves that build. Use `npm run dev:fixture` only when you want the explicitly labeled synthetic contract fixture.

### Pipeline and analysis

Raw WHO files are not committed. **There is currently no acquire/download CLI command.** Before building:

1. Open [`pipeline/config/sources.yaml`](pipeline/config/sources.yaml). For each entry under `who_ghe_2023.files`, concatenate its value with `base_url` and download that URL. This includes the deaths and DALY workbooks for the listed years, both reference-rate workbooks and the standard-population PDF.
2. Save them in `pipeline/data/raw/who_ghe2023/`, using the URL's filename **without the `?sfvrsn=…` query**. Keep the full filename, including the extra suffix on the 2023 deaths workbook. The five standard populations are already transcribed in [`standard_populations.csv`](pipeline/config/standard_populations.csv).
3. Keep the pinned SHA-256 values unchanged. Builds verify them and reject different inputs; `hashes` records new hashes and should only be used after reviewing a deliberate source update. The old acquire-command comment in the YAML does not describe an implemented command.

From the repository root, these commands work in PowerShell and macOS/Linux shells:

```sh
cd pipeline
uv sync --locked
uv run python -m visceral_pipeline build
uv run python -m visceral_pipeline analyze
uv run python -m visceral_pipeline report
```

`build` parses, caches, validates and exports real data; `build --skip-parse` reuses a fingerprint-checked cache. `analyze` regenerates analysis tables, figures, chart JSON, the write-up and five executed notebooks. `report` refreshes the validation report. Once dependencies and raw inputs are present, these stages run offline. See the [pipeline guide](pipeline/README.md) for copied-environment import paths and notebook-execution fallbacks.

### Rebuild the anatomy (optional)

Download BodyParts3D 4.0 using the sources in [`sources.yaml`](pipeline/config/sources.yaml) and the [anatomy guide](assets/README.md). The build needs both `partof` and `isa` mapping tables **and all referenced OBJ elements**, under `assets/source/bodyparts3d/`; tables alone are insufficient. The expected OBJ layout is `obj/{partof|isa}_BP3D_4.0_obj_99/`. Install the web dependencies first for the compression step.

From the repository root in PowerShell, adjust the Blender executable path to your installation:

```powershell
$blender = 'D:\Blender Foundation\Blender 5.2\blender.exe'
& $blender --background --factory-startup --python-exit-code 1 --python assets/build_anatomy.py -- --source assets/source/bodyparts3d --out assets/build/visceral.raw.glb --report assets/build/report.json
npx --no-install --prefix web gltf-transform meshopt assets/build/visceral.raw.glb web/public/models/visceral.glb
```

On macOS/Linux, replace `& $blender` with `blender` (or your executable's path); the remaining arguments and compression command are identical. Source resolution, geometry derivations and validation commands are documented in [`assets/README.md`](assets/README.md).

## Testing & quality

| Area | Current test count | Coverage |
|---|---:|---|
| Pipeline and analysis | **27**: 18 core + 9 analysis | Parsing, schemas, hierarchy partition, standardization, reconciliation, contract exports, ranking, resampling and mapping sensitivity |
| Web | **46** across 14 files | Data loading, selectors, URL state, filters, keyboard interactions, errors, model decoding and scene runtime |
| Anatomy | **9** source/export tests + **1** Blender-only geometry test | Source resolution, contract mesh names, metadata and connected lung-envelope geometry |

Run `uv run ruff check src tests` and `uv run pytest -q` from `pipeline/`; run `npm run lint`, `npm test` and `npm run build` from `web/`. The [CI workflow](.github/workflows/ci.yml) runs those checks on pushes to `main` and pull requests. It does not rebuild WHO data or run the anatomy suite.

`bash scripts/check.sh` runs the pipeline and web gates from the repository root. On Windows without Bash, run the commands above directly. Anatomy tests run separately with `uv run --project pipeline python -m unittest discover -s assets/tests -v` from the root; the archive test needs complete raw anatomy inputs, and the geometry test requires Blender's Python. See the [anatomy test instructions](assets/README.md#validation).

The [committed validation report](pipeline/reports/validation.md) records real-data checks separately from unit tests: dimensions, unique keys, missingness, sex/age sums, hierarchy reconciliation and agreement with WHO reference rates. Known source inconsistencies remain visible rather than being silently repaired.

## Limitations & honesty

- **Descriptive estimates:** WHO modeled point estimates do not establish causality, individual risk or health-system performance. Source uncertainty intervals are unavailable here. Clustering stability is not uncertainty in WHO's estimates; eight irregular time points do not support forecasting.
- **Cause attribution:** a single underlying cause is assigned to one primary group. This simplifies systemic disease and cannot represent multimorbidity or all affected tissues. Mapping alternatives can change rankings without changing any underlying deaths.
- **Methods differ explicitly:** country death ASDRs sum WHO's fine-age cause rates. DALYs and World use seven broad age bins, including an open 70+ bin. World is the sum of the available countries, not a separately published WHO global estimate.
- **Anatomical limits:** the model is a male reference body; the sex filter changes statistics, not the anatomy. Some groups are list-only. Lung surfaces are derived envelopes of bronchial/vascular trees, and the thyroid is stylized. Neither is a clinical reconstruction.

## Credits & license

WHO supplies the [Global Health Estimates](https://www.who.int/data/global-health-estimates); the derived organ aggregates and interpretations are this project's work, not official WHO figures or an endorsement. WHO data remain subject to [WHO's terms](https://www.who.int/about/policies/publishing/data-policy/terms-and-conditions).

BodyParts3D 4.0, © The Database Center for Life Science, is licensed under **CC BY 4.0**; the model is modified as documented in the [anatomy guide](assets/README.md). The project builds on the open-source libraries listed above. The **[MIT license](LICENSE) covers the project's source code**, not a replacement license for third-party data or anatomy assets. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Built by narowtow with AI coding agents (Claude, Codex) for implementation; the project's questions, decisions and review are the author's.

**Medical disclaimer:** this is an educational visualization of population-level burden associated with mapped causes. It provides no diagnosis, treatment advice or individual risk estimates.
