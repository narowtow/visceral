# Where does disease burden appear to fall?

**Question.** How do age structure, sex and analytical choices change the apparent body profile of disease burden? These are descriptive comparisons of causes attributed to groups, never measures of organ health or causal explanations.

## Data and methods

WHO GHE 2023 provides 15,486,720 observations for 185 countries, two measures, three sex categories and eight age sheets at eight irregular time points: 2000, 2010, 2015 and 2019–2023. The mapping partitions the cause hierarchy once across 31 groups. WLD sums these countries' counts and populations before computing rates. It is not a separately published WHO world estimate. [Validation](../pipeline/reports/validation.md) retains known source inconsistencies and pinned exceptions without inventing residuals.

Country death ASDRs sum WHO's published fine-age cause rates. DALYs and WLD use direct standardization over **seven broad age bins**, with normalized WHO2026 weights. All five standard-population comparisons use broad bins, isolating weight choice. Highest burden ranks first; ties receive average ranks. Country summaries give each country equal weight. Distribution percentiles are descriptive, not confidence intervals.

## Findings

**1. Age adjustment reorders comparisons.** Across 185 countries, crude versus ASDR country-rank Spearman ρ is 0.252 for heart and 0.030 for brain. JPN: 189.9 crude → 82.0 standardized deaths per 100,000; rank 43 → 180, with 23.6% aged 70+. NGA: 57.9 crude → 339.3 standardized deaths per 100,000; rank 152 → 46, with 1.7% aged 70+. These differences reflect age adjustment together with the observed age-specific burden, not a causal effect of aging. DALY ranking agreement is higher for heart (0.545) and brain (0.479). Complete correlations, within-country organ ranks and the largest movers are in notebook 02.

Within-country rankings of the 30 nonempty groups are much more stable: median death-profile ρ=0.978. Country ordering for a group and group ordering within a country are different comparisons.

![Age structure and country comparisons](figures/age-rankings.png)

**2. Pre-pandemic progress and the COVID component differ.** From 2000 to 2019, WLD death ASDR changed by -18.5% for heart, -17.0% for brain and -25.7% for lungs; lung DALYs changed by -35.3%. In 2020 and 2021, lung death ASDR was respectively 46.7% and 83.7% above observed 2019. The 2021 increase was 153.99 per 100,000: COVID contributed an additive 168.77, while other mapped lung causes changed by -14.78. Thus COVID is 109.6% of the net change. This is bookkeeping; 2019 is a reference observation, not a modeled pandemic-free counterfactual. Country changes and both measures are tabulated in notebook 03.

**3. Patterns exist, but clustering is conditional.** We used equally weighted countries and standardized log(1 + ASDR) features, retaining absolute intensity while reducing skew. The empty muscles group is constant and excluded. Across k=2…8, k=2 has the best silhouette (0.229) and median bootstrap ARI 0.936 (p05–p95 0.874–0.978, 100 resamples). The declared rule requires median ARI ≥0.80, p05 ≥0.50, minimum cluster size ≥5, then prefers the best silhouette (within 0.02, the smaller k). It selects 83 and 102 countries. Pattern 1 has relatively higher small-intestine, maternal/neonatal and lung features; pattern 2 has higher colorectal, pancreas and bladder features. These are transformed centroid contrasts, not value judgments or claims that every member shares every feature.

PCA's first two components explain 44.7% of feature variance; clustering uses all 30 features. Ward agreement ARI is only 0.396. Using standardized composition shares also favors k=2 by silhouette but agrees at ARI 0.397; compositional closure removes overall intensity. These modest agreements limit any interpretation as intrinsic country types.

**4. Method and attribution matter.** Broad-bin brain death ASDR differs from published fine-age sums by a country median -15.02% (p05–p95 -25.92% to 5.65%); heart's median is -13.67%. Brain has 68.0% of global mapped deaths at 70+. Across groups, median signed method difference and 70+ share have Spearman ρ=-0.687. Pooling ages, especially the open 70+ bin, loses within-bin age concentration; the association does not prove that this alone causes each difference. Global trends therefore inherit a quantifiable approximation.

Across the four alternative standards and both measures, the weakest country-ranking agreement with broad-bin WHO2026 is ρ=0.921 (Segi, deaths, blood_immune); group-specific results and global organ ranks appear in notebook 05. The alternative mapping sends TB/COVID to systemic infections, diabetes to pancreas and the inseparable mental/substance aggregate to brain. Hypertensive heart disease remains heart; noncardiac-specific other circulatory disease remains unallocated. Pancreas moves from death-ASDR rank 16 to 7, and its primary death share from 0.98% to 4.30%. Unallocated shares remain 6.31% of deaths and 6.50% of DALYs because this scenario only moves allocated causes. Totals are preserved.

Global death-ASDR ordering also changes with weights: WHO2026 ranks heart first and lungs second; Segi ranks lungs first and heart second. All standards use the same broad-bin rates in this comparison.

**5. Sex contrasts depend on the group and measure.** Global male/female mental/substance ASDR ratios are 3.56 for deaths and 1.03 for DALYs; the bones/joints DALY ratio is 0.67. Country injury-death ratios have median 2.58 and p05–p95 1.59–4.53. Reproductive groups (including breast) and mixed maternal/neonatal causes are excluded; zero female denominators yield missing ratios.

## Limits and reproducibility

WHO estimates are modeled point estimates; source uncertainty intervals are unavailable here. Neither bootstrap clustering stability nor country percentiles measure that uncertainty. Cause attribution simplifies systemic disease and single-underlying-cause deaths do not capture multimorbidity. Rare or nearly zero death groups have unstable ratios and ranks; empty muscles have undefined correlations. Feature standardization gives rare groups influence, log1p depends on the per-100,000 unit, k-means assumes Euclidean structure, and the PCA view omits much variance. Descriptive differences cannot establish exposure, treatment or health-system effects. Eight irregular dates do not support forecasting.

From `pipeline/`, run `.venv/Scripts/python.exe -m visceral_pipeline analyze` with the validated interim cache present. It regenerates analysis parquet tables, six figures, compact chart JSON, this text and five executed [notebooks](../pipeline/notebooks/). Fixed seed 2026 and 100 bootstrap samples per k are recorded. The existing production burden exports are retained. All figure captions identify WHO GHE 2023; Visceral analysis. Source provenance and terms are documented in the [pipeline README](../pipeline/README.md#data-provenance--terms).
