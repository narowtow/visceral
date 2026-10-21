# Visceral

**Explore global population health through human anatomy.**

Visceral is an interactive 3D body whose organs are colored by the burden of disease associated with them (deaths and DALYs from the WHO Global Health Estimates 2023), for any country, sex, age group and year from 2000 to 2023. Behind the visualization is a reproducible Python data pipeline that maps WHO causes of death to organs, computes crude and age-standardized rates, and powers an analysis of how age structure changes where in the body the burden of disease falls.

> 🚧 Work in progress. The live demo, findings and screenshots will appear here.

## Repository layout
| Folder | What it is |
|---|---|
| `pipeline/` | Python (uv, pandas, DuckDB, Pandera, pytest): WHO data → validated, organ-level JSON |
| `web/` | React + TypeScript + React Three Fiber site |
| `contracts/` | The data contract between pipeline and site, plus a synthetic fixture |
| `assets/` | 3D anatomy model build (BodyParts3D → GLB) |

## Data & credits
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). This is an educational visualization of population-level statistics. It does not provide diagnosis, treatment advice or individual risk estimates.
