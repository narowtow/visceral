"""Small, tidy chart datasets and measured narrative, generated from analysis tables."""

import json
from numbers import Real
from pathlib import Path

import numpy as np
import pandas as pd

from ..constants import ROOT
from ..export import sig


def json_value(value):
    if isinstance(value, dict):
        return {str(k): json_value(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, np.ndarray)):
        return [json_value(v) for v in value]
    if isinstance(value, (bool, np.bool_)):
        return bool(value)
    if isinstance(value, Real):
        return sig(value)
    if value is None or pd.isna(value):
        return None
    return value


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(json_value(value), ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    if len(encoded.encode("utf-8")) >= 200000:
        raise ValueError(f"Analysis JSON exceeds 200 KB: {path}")
    path.write_text(encoded, encoding="utf-8")


def figure_datasets(f):
    """Each tuple is an independently chartable, bounded data table."""
    return [
        (
            "age-rankings",
            "Age structure changes country comparisons",
            "2023, both sexes: heart and brain rates per 100,000; country deaths use WHO fine-age ASDRs.",
            f["country_ranks"].query("organ in ['heart','brain']")[
                [
                    "measure",
                    "location",
                    "organ",
                    "rate",
                    "ageStdRate",
                    "rank_a",
                    "rank_b",
                    "rank_change",
                    "population_70_plus",
                ]
            ],
        ),
        (
            "rank-correlations",
            "Country ranking agreement by cause group",
            "Spearman rho of crude and standardized rankings across 185 countries, 2023; undefined constants are null.",
            f["rank_correlations"],
        ),
        (
            "organ-rankings",
            "Organ ranking agreement within countries",
            "Spearman rho across 30 groups; empty muscles excluded; highest burden ranks first.",
            f["profile_correlations"],
        ),
        (
            "global-trends",
            "Eight observed global time points",
            "Both sexes, WLD: counts and rates per 100,000. WLD ASDRs use seven broad ages; no forecasting.",
            f["world_trends"][["measure", "year", "organ", "count", "rate", "ageStdRate"]],
        ),
        (
            "country-trends",
            "Country ASDR changes from 2000 to 2019",
            "Country p05, median and p95 percent changes by group; descriptive distribution, not confidence intervals.",
            f["trends"]
            .query("location!='WLD'")
            .groupby(["measure", "organ"])["change_2000_2019"]
            .quantile([0.05, 0.5, 0.95])
            .unstack()
            .rename(columns={0.05: "p05", 0.5: "median", 0.95: "p95"})
            .reset_index(),
        ),
        (
            "pandemic-decomposition",
            "COVID-19 and the mapped lung increase",
            "Observed 2020/2021 minus 2019: additive cause accounting, not a causal counterfactual. Shares may exceed 100%.",
            f["pandemic"],
        ),
        (
            "country-patterns",
            "Two descriptive country patterns",
            "2023 deaths ASDR: PCA coordinates of standardized log1p rates; clustering used all 30 variable groups.",
            f["cluster_membership"],
        ),
        (
            "cluster-selection",
            "Separation and bootstrap stability for k=2..8",
            "100 country bootstrap samples per k; scaling and fitting repeated; ARI compares predictions on all countries.",
            f["cluster_diagnostics"],
        ),
        (
            "cluster-centroids",
            "Profiles of the descriptive patterns",
            "z is the centroid in standardized log1p rate space; median_rate is the observed member median per 100,000.",
            f["cluster_centroids"],
        ),
        (
            "age-methods",
            "Broad-bin versus published fine-age deaths ASDR",
            "2023 both sexes; country quantiles of 100*(broad-published)/published, paired with global 70+ death share (%).",
            f["methods_summary"],
        ),
        (
            "standard-rankings",
            "Changing the standard population",
            "Country ranking agreement against WHO2026; all five standards use the same broad-bin method.",
            f["standard_correlations"],
        ),
        (
            "standard-organ-rankings",
            "Global organ rankings under five standards",
            "2023 both sexes, WLD; standardized rates per 100,000 and within-measure organ rank (30 groups).",
            f["standard_world"][["measure", "standard", "organ", "ageStdRate", "rank"]],
        ),
        (
            "standards-mapping",
            "Alternative cause attribution",
            "2023 both sexes WLD: COVID/TB to systemic, diabetes to pancreas, mental/substance to brain; counts unchanged.",
            f["mapping"].query("location=='WLD'")[
                [
                    "measure",
                    "organ",
                    "count_share_base",
                    "count_share_alt",
                    "ageStdRate_base",
                    "ageStdRate_alt",
                    "rank_base",
                    "rank_alt",
                    "rank_change",
                ]
            ],
        ),
        (
            "sex-ratios",
            "Male/female standardized burden ratios",
            "2023: WLD ratios (broad-bin) and country quantiles (deaths fine-age; DALYs broad-bin). Reproductive and mixed maternal groups excluded.",
            f["sex_summary"],
        ),
    ]


def headline_findings(f, meta):
    rho = f["rank_correlations"].set_index(["measure", "organ"])
    pandemic = f["pandemic"].query("measure=='deaths' and year==2021 and metric=='ageStdRate'").iloc[0]
    methods = f["methods_summary"].set_index("organ")
    mapping = f["mapping"].query("location=='WLD' and measure=='deaths'").set_index("organ")
    sex = f["sex_summary"].set_index(["measure", "organ"])
    k = meta["clustering"]["selected_k"]
    diag = f["cluster_diagnostics"].set_index("k").loc[k]
    return [
        {
            "id": "age-structure",
            "headline": "Age adjustment substantially reorders heart and brain country comparisons",
            "detail": f"Across 185 countries, crude versus standardized death-rate ranking rho is {rho.loc[('deaths', 'brain'), 'rho']:.3f} for brain and {rho.loc[('deaths', 'heart'), 'rho']:.3f} for heart. Rankings describe mapped burden, not health-system performance.",
            "numbers": {
                "countries": 185,
                "brainRho": rho.loc[("deaths", "brain"), "rho"],
                "heartRho": rho.loc[("deaths", "heart"), "rho"],
            },
            "figureIds": ["age-rankings", "rank-correlations", "organ-rankings"],
        },
        {
            "id": "pandemic",
            "headline": "COVID-19 exceeds the net 2019–2021 increase in mapped lung deaths",
            "detail": f"Global broad-bin lung ASDR rose by {pandemic.change:.1f} per 100,000. The COVID component rose by {pandemic.cause_change:.1f}, while all other mapped lung causes together fell by {-pandemic.other_change:.1f}. This is additive accounting, not a causal estimate.",
            "numbers": {
                "lungRateChange": pandemic.change,
                "covidRateChange": pandemic.cause_change,
                "otherRateChange": pandemic.other_change,
                "covidPercentOfNetChange": pandemic.cause_share_of_net_change_percent,
            },
            "figureIds": ["global-trends", "country-trends", "pandemic-decomposition"],
        },
        {
            "id": "method",
            "headline": "The median country difference in brain ASDR is −15% with broad age bins",
            "detail": f"For brain, the median difference is {methods.loc['brain', 'median']:.2f}% (country p05–p95 {methods.loc['brain', 'p05']:.2f}% to {methods.loc['brain', 'p95']:.2f}%). Reassigning diabetes moves pancreas from global death-ASDR rank {mapping.loc['pancreas', 'rank_base']:.0f} to {mapping.loc['pancreas', 'rank_alt']:.0f}; burden totals are unchanged.",
            "numbers": {
                "brainMedianDifferencePercent": methods.loc["brain", "median"],
                "brainP05": methods.loc["brain", "p05"],
                "brainP95": methods.loc["brain", "p95"],
                "ageConcentrationRho": meta["age_bias_group_rho"],
                "pancreasRankBase": mapping.loc["pancreas", "rank_base"],
                "pancreasRankAlternative": mapping.loc["pancreas", "rank_alt"],
            },
            "figureIds": ["age-methods", "standards-mapping", "standard-rankings", "standard-organ-rankings"],
        },
        {
            "id": "patterns",
            "headline": "Two reproducible patterns have modest separation and method-dependent membership",
            "detail": f"k={k} has silhouette {diag.silhouette:.3f} and median bootstrap ARI {diag.ari_median:.3f}. Ward agreement is {meta['clustering']['hierarchical_ari']:.3f}, so the split is a descriptive summary rather than a natural classification.",
            "numbers": {
                "k": k,
                "silhouette": diag.silhouette,
                "bootstrapMedianARI": diag.ari_median,
                "bootstrapP05ARI": diag.ari_p05,
                "wardARI": meta["clustering"]["hierarchical_ari"],
                "compositionARI": meta["clustering"]["composition_ari"],
            },
            "figureIds": ["country-patterns", "cluster-selection", "cluster-centroids"],
        },
        {
            "id": "sex",
            "headline": "Sex contrasts depend on the group and burden measure",
            "detail": f"The global male/female mental/substance ASDR ratio is {sex.loc[('deaths', 'mental_substance'), 'world_ratio']:.2f} for deaths and {sex.loc[('dalys', 'mental_substance'), 'world_ratio']:.2f} for DALYs. For bones/joints DALYs it is {sex.loc[('dalys', 'bones_joints'), 'world_ratio']:.2f}. Sex-specific groups are excluded from these comparisons.",
            "numbers": {
                "injuryDeathsMaleFemale": sex.loc[("deaths", "injuries"), "world_ratio"],
                "bonesJointsDalysMaleFemale": sex.loc[("dalys", "bones_joints"), "world_ratio"],
                "mentalSubstanceDeathsMaleFemale": sex.loc[("deaths", "mental_substance"), "world_ratio"],
                "mentalSubstanceDalysMaleFemale": sex.loc[("dalys", "mental_substance"), "world_ratio"],
            },
            "figureIds": ["sex-ratios"],
        },
    ]


def publish_json(frames, meta, output=ROOT / "web/public/data/analysis"):
    output = Path(output)
    findings = headline_findings(frames, meta)
    rho = frames["rank_correlations"].set_index(["measure", "organ"])
    profiles = frames["profile_correlations"].query("location!='WLD' and measure=='deaths'")
    trends = frames["trends"].set_index(["measure", "location", "organ"])
    country_trends = frames["trends"].query("measure=='deaths' and location!='WLD' and organ=='heart'")
    standards = frames["standard_correlations"].query("standard!='WHO2026'")
    worst = standards.loc[standards.rho.idxmin()]
    chosen = frames["cluster_diagnostics"].set_index("k").loc[meta["clustering"]["selected_k"]]
    world_mapping = frames["mapping"].query("location=='WLD' and measure=='deaths'").set_index("organ")
    sex = frames["sex_summary"].set_index(["measure", "organ"])
    methods = frames["methods_summary"].dropna(subset=["median"])
    largest_bias = methods.loc[methods["median"].idxmin()]
    world = frames["standard_world"].query("measure=='deaths'").sort_values("rank")
    leading = world.groupby("standard").first()
    pattern = meta["clustering"]["profiles"]
    takeaways = {
        "age-rankings": f"Heart country-rank agreement is only ρ={rho.loc[('deaths', 'heart'), 'rho']:.3f} after age adjustment.",
        "rank-correlations": f"Brain country death rankings have crude-versus-ASDR ρ={rho.loc[('deaths', 'brain'), 'rho']:.3f}.",
        "organ-rankings": f"Within-country organ death rankings are more stable, with median ρ={profiles.rho.median():.3f}.",
        "global-trends": f"Global lung death ASDR in 2021 is {trends.loc[('deaths', 'WLD', 'lungs'), 'change_2019_2021']:.1f}% above observed 2019.",
        "country-trends": f"The median country heart death-ASDR change from 2000 to 2019 is {country_trends.change_2000_2019.median():.1f}%.",
        "pandemic-decomposition": "COVID exceeds the net mapped lung increase because other mapped lung causes decline.",
        "country-patterns": f"The selected k={meta['clustering']['selected_k']} summarizes profiles with method-dependent membership.",
        "cluster-selection": f"k={meta['clustering']['selected_k']} has silhouette {chosen.silhouette:.3f} and median bootstrap ARI {chosen.ari_median:.3f}.",
        "cluster-centroids": f"Pattern 1 has higher relative {', '.join(pattern[0]['higher_features'])} features; pattern 2 has higher {', '.join(pattern[1]['higher_features'])} features.",
        "age-methods": f"{largest_bias.organ} has the largest median broad-bin underestimate ({largest_bias['median']:.2f}%) among the mapped groups in 2023.",
        "standard-rankings": f"The weakest country-rank agreement across alternative standards is ρ={worst.rho:.3f}, for {worst.organ} {worst.measure} under {worst.standard}.",
        "standard-organ-rankings": f"Segi switches the top global death-ASDR group from {leading.loc['WHO2026', 'organ']} to {leading.loc['Segi', 'organ']} compared with WHO2026.",
        "standards-mapping": f"Moving diabetes to pancreas changes its global death-ASDR rank from {world_mapping.loc['pancreas', 'rank_base']:.0f} to {world_mapping.loc['pancreas', 'rank_alt']:.0f} while totals stay constant.",
        "sex-ratios": f"Global mental/substance male/female ratios are {sex.loc[('deaths', 'mental_substance'), 'world_ratio']:.2f} for deaths and {sex.loc[('dalys', 'mental_substance'), 'world_ratio']:.2f} for DALYs.",
    }
    entries = []
    for figure_id, title, description, frame in figure_datasets(frames):
        write_json(
            output / f"{figure_id}.json",
            {
                "schemaVersion": 1,
                "id": figure_id,
                "title": title,
                "description": description,
                "data": frame.to_dict("records"),
            },
        )
        entries.append(
            {"id": figure_id, "title": title, "file": f"{figure_id}.json", "takeaway": takeaways[figure_id]}
        )
    write_json(output / "index.json", {"schemaVersion": 1, "figures": entries})
    write_json(output / "findings.json", {"schemaVersion": 1, "findings": findings})
    paths = sorted(output.glob("*.json"))
    return {
        "files": len(paths),
        "bytes": sum(p.stat().st_size for p in paths),
        "largest": max(paths, key=lambda p: p.stat().st_size).name,
        "largest_bytes": max(p.stat().st_size for p in paths),
    }


def write_narrative(f, meta, path=ROOT / "docs/analysis.md"):
    r = f["country_ranks"].set_index(["measure", "organ", "location"])
    rho = f["rank_correlations"].set_index(["measure", "organ"])
    trend = f["trends"].set_index(["measure", "location", "organ"])
    pandemic = f["pandemic"].query("measure=='deaths' and metric=='ageStdRate'").set_index("year")
    methods = f["methods_summary"].set_index("organ")
    ratios = f["sex_summary"].set_index(["measure", "organ"])
    mapping = f["mapping"].query("location=='WLD'").set_index(["measure", "organ"])
    diag = f["cluster_diagnostics"].set_index("k").loc[meta["clustering"]["selected_k"]]
    standards = f["standard_correlations"].query("standard!='WHO2026' and organ!='muscles'")
    worst = standards.loc[standards.rho.idxmin()]
    profile_median = f["profile_correlations"].query("measure=='deaths' and location!='WLD'").rho.median()

    def example(country):
        row = r.loc[("deaths", "heart", country)]
        return f"{country}: {row.rate:.1f} crude → {row.ageStdRate:.1f} standardized deaths per 100,000; rank {row.rank_a:.0f} → {row.rank_b:.0f}, with {row.population_70_plus:.1f}% aged 70+"

    text = f"""# Where does disease burden appear to fall?

**Question.** How do age structure, sex and analytical choices change the apparent body profile of disease burden? These are descriptive comparisons of causes attributed to groups, never measures of organ health or causal explanations.

## Data and methods

WHO GHE 2023 provides {meta["observations"]:,} observations for 185 countries, two measures, three sex categories and eight age sheets at eight irregular time points: 2000, 2010, 2015 and 2019–2023. The mapping partitions the cause hierarchy once across 31 groups. WLD sums these countries' counts and populations before computing rates. It is not a separately published WHO world estimate. [Validation](../pipeline/reports/validation.md) retains known source inconsistencies and pinned exceptions without inventing residuals.

Country death ASDRs sum WHO's published fine-age cause rates. DALYs and WLD use direct standardization over **seven broad age bins**, with normalized WHO2026 weights. All five standard-population comparisons use broad bins, isolating weight choice. Highest burden ranks first; ties receive average ranks. Country summaries give each country equal weight. Distribution percentiles are descriptive, not confidence intervals.

## Findings

**1. Age adjustment reorders comparisons.** Across 185 countries, crude versus ASDR country-rank Spearman ρ is {rho.loc[("deaths", "heart"), "rho"]:.3f} for heart and {rho.loc[("deaths", "brain"), "rho"]:.3f} for brain. {example("JPN")}. {example("NGA")}. These differences reflect age adjustment together with the observed age-specific burden, not a causal effect of aging. DALY ranking agreement is higher for heart ({rho.loc[("dalys", "heart"), "rho"]:.3f}) and brain ({rho.loc[("dalys", "brain"), "rho"]:.3f}). Complete correlations, within-country organ ranks and the largest movers are in notebook 02.

Within-country rankings of the 30 nonempty groups are much more stable: median death-profile ρ={profile_median:.3f}. Country ordering for a group and group ordering within a country are different comparisons.

![Age structure and country comparisons](figures/age-rankings.png)

**2. Pre-pandemic progress and the COVID component differ.** From 2000 to 2019, WLD death ASDR changed by {trend.loc[("deaths", "WLD", "heart"), "change_2000_2019"]:.1f}% for heart, {trend.loc[("deaths", "WLD", "brain"), "change_2000_2019"]:.1f}% for brain and {trend.loc[("deaths", "WLD", "lungs"), "change_2000_2019"]:.1f}% for lungs; lung DALYs changed by {trend.loc[("dalys", "WLD", "lungs"), "change_2000_2019"]:.1f}%. In 2020 and 2021, lung death ASDR was respectively {trend.loc[("deaths", "WLD", "lungs"), "change_2019_2020"]:.1f}% and {trend.loc[("deaths", "WLD", "lungs"), "change_2019_2021"]:.1f}% above observed 2019. The 2021 increase was {pandemic.loc[2021, "change"]:.2f} per 100,000: COVID contributed an additive {pandemic.loc[2021, "cause_change"]:.2f}, while other mapped lung causes changed by {pandemic.loc[2021, "other_change"]:.2f}. Thus COVID is {pandemic.loc[2021, "cause_share_of_net_change_percent"]:.1f}% of the net change. This is bookkeeping; 2019 is a reference observation, not a modeled pandemic-free counterfactual. Country changes and both measures are tabulated in notebook 03.

**3. Patterns exist, but clustering is conditional.** We used equally weighted countries and standardized log(1 + ASDR) features, retaining absolute intensity while reducing skew. The empty muscles group is constant and excluded. Across k=2…8, k=2 has the best silhouette ({diag.silhouette:.3f}) and median bootstrap ARI {diag.ari_median:.3f} (p05–p95 {diag.ari_p05:.3f}–{diag.ari_p95:.3f}, 100 resamples). The declared rule requires median ARI ≥0.80, p05 ≥0.50, minimum cluster size ≥5, then prefers the best silhouette (within 0.02, the smaller k). It selects 83 and 102 countries. Pattern 1 has relatively higher small-intestine, maternal/neonatal and lung features; pattern 2 has higher colorectal, pancreas and bladder features. These are transformed centroid contrasts, not value judgments or claims that every member shares every feature.

PCA's first two components explain {sum(meta["clustering"]["pca_explained_variance"]) * 100:.1f}% of feature variance; clustering uses all 30 features. Ward agreement ARI is only {meta["clustering"]["hierarchical_ari"]:.3f}. Using standardized composition shares also favors k=2 by silhouette but agrees at ARI {meta["clustering"]["composition_ari"]:.3f}; compositional closure removes overall intensity. These modest agreements limit any interpretation as intrinsic country types.

**4. Method and attribution matter.** Broad-bin brain death ASDR differs from published fine-age sums by a country median {methods.loc["brain", "median"]:.2f}% (p05–p95 {methods.loc["brain", "p05"]:.2f}% to {methods.loc["brain", "p95"]:.2f}%); heart's median is {methods.loc["heart", "median"]:.2f}%. Brain has {methods.loc["brain", "world_70_plus_share"]:.1f}% of global mapped deaths at 70+. Across groups, median signed method difference and 70+ share have Spearman ρ={meta["age_bias_group_rho"]:.3f}. Pooling ages, especially the open 70+ bin, loses within-bin age concentration; the association does not prove that this alone causes each difference. Global trends therefore inherit a quantifiable approximation.

Across the four alternative standards and both measures, the weakest country-ranking agreement with broad-bin WHO2026 is ρ={worst.rho:.3f} ({worst.standard}, {worst.measure}, {worst.organ}); group-specific results and global organ ranks appear in notebook 05. The alternative mapping sends TB/COVID to systemic infections, diabetes to pancreas and the inseparable mental/substance aggregate to brain. Hypertensive heart disease remains heart; noncardiac-specific other circulatory disease remains unallocated. Pancreas moves from death-ASDR rank {mapping.loc[("deaths", "pancreas"), "rank_base"]:.0f} to {mapping.loc[("deaths", "pancreas"), "rank_alt"]:.0f}, and its primary death share from {mapping.loc[("deaths", "pancreas"), "count_share_base"]:.2f}% to {mapping.loc[("deaths", "pancreas"), "count_share_alt"]:.2f}%. Unallocated shares remain {mapping.loc[("deaths", "other_unallocated"), "count_share_base"]:.2f}% of deaths and {mapping.loc[("dalys", "other_unallocated"), "count_share_base"]:.2f}% of DALYs because this scenario only moves allocated causes. Totals are preserved.

Global death-ASDR ordering also changes with weights: WHO2026 ranks heart first and lungs second; Segi ranks lungs first and heart second. All standards use the same broad-bin rates in this comparison.

**5. Sex contrasts depend on the group and measure.** Global male/female mental/substance ASDR ratios are {ratios.loc[("deaths", "mental_substance"), "world_ratio"]:.2f} for deaths and {ratios.loc[("dalys", "mental_substance"), "world_ratio"]:.2f} for DALYs; the bones/joints DALY ratio is {ratios.loc[("dalys", "bones_joints"), "world_ratio"]:.2f}. Country injury-death ratios have median {ratios.loc[("deaths", "injuries"), "median"]:.2f} and p05–p95 {ratios.loc[("deaths", "injuries"), "p05"]:.2f}–{ratios.loc[("deaths", "injuries"), "p95"]:.2f}. Reproductive groups (including breast) and mixed maternal/neonatal causes are excluded; zero female denominators yield missing ratios.

## Limits and reproducibility

WHO estimates are modeled point estimates; source uncertainty intervals are unavailable here. Neither bootstrap clustering stability nor country percentiles measure that uncertainty. Cause attribution simplifies systemic disease and single-underlying-cause deaths do not capture multimorbidity. Rare or nearly zero death groups have unstable ratios and ranks; empty muscles have undefined correlations. Feature standardization gives rare groups influence, log1p depends on the per-100,000 unit, k-means assumes Euclidean structure, and the PCA view omits much variance. Descriptive differences cannot establish exposure, treatment or health-system effects. Eight irregular dates do not support forecasting.

From `pipeline/`, run `.venv/Scripts/python.exe -m visceral_pipeline analyze` with the validated interim cache present. It regenerates analysis parquet tables, six figures, compact chart JSON, this text and five executed [notebooks](../pipeline/notebooks/). Fixed seed 2026 and 100 bootstrap samples per k are recorded. The existing production burden exports are retained. All figure captions identify WHO GHE 2023; Visceral analysis. Source provenance and terms are documented in the [pipeline README](../pipeline/README.md#data-provenance--terms).
"""
    Path(path).write_text(text, encoding="utf-8")
