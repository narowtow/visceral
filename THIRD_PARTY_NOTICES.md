# Third-party data and assets

The MIT license in `LICENSE` covers this project's source code only.

## WHO Global Health Estimates 2023
- Global Health Estimates 2023: Deaths by Cause, Age, Sex, by Country and by Region, 2000-2023. Geneva, World Health Organization; 2026.
- Global Health Estimates 2023: Disease burden by Cause, Age, Sex, by Country and by Region, 2000-2023. Geneva, World Health Organization; 2026.
- Source: https://www.who.int/data/gho/data/themes/mortality-and-global-health-estimates
- Terms: https://www.who.int/about/policies/publishing/data-policy/terms-and-conditions
- Raw WHO files are **not** included in this repository. They are downloaded by `pipeline` from WHO's site (see `pipeline/config/sources.yaml`).
- `web/public/data/` contains **derived aggregates** computed by this project: WHO causes grouped by organ using this project's own mapping, plus crude and age-standardized rates. These are this project's analysis, not official WHO figures. WHO is not responsible for them and does not endorse this project. The estimates are based on data provided by WHO Member States.
- WHO 2026 standard population: Revised WHO standard population for calculating age-standardized rates. WHO/HSA/DDA/GHE/2026.4. Geneva, World Health Organization; 2026.

## BodyParts3D 4.0
- BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.
- Source: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/
- License: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html (CC BY 4.0, https://creativecommons.org/licenses/by/4.0/)
- **Modifications:** selected structures were merged into organ groups, renamed, decimated and compressed into `web/public/models/visceral.glb` by `assets/build_anatomy.py`.
