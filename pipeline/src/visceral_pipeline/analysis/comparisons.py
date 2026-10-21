"""Rankings, period comparisons and sex ratios; no causal interpretation is implied."""

import numpy as np
import pandas as pd

SEX_EXCLUSIONS = {"breast", "prostate", "testes", "uterus_cervix", "ovaries", "maternal_neonatal"}


def rank_comparison(frame, a, b, groups):
    """Paired ranks, highest value first. Positive change moves toward rank one."""
    result = frame.dropna(subset=[a, b]).copy()
    result["rank_a"] = result.groupby(groups, dropna=False)[a].rank(ascending=False, method="average")
    result["rank_b"] = result.groupby(groups, dropna=False)[b].rank(ascending=False, method="average")
    result["rank_change"] = result.rank_a - result.rank_b
    return result


def rank_correlations(ranks, groups):
    rows = []
    for keys, group in ranks.groupby(groups, sort=True):
        keys = keys if isinstance(keys, tuple) else (keys,)
        rho = (
            group.rank_a.corr(group.rank_b)
            if group.rank_a.nunique() > 1 and group.rank_b.nunique() > 1
            else np.nan
        )
        rows.append(
            dict(zip(groups, keys))
            | {"n": len(group), "rho": rho, "max_abs_rank_change": group.rank_change.abs().max()}
        )
    return pd.DataFrame(rows)


def percent_change(before, after):
    """Zero or unavailable baseline has no defined relative change."""
    if pd.isna(before) or pd.isna(after) or before <= 0:
        return np.nan
    return (after / before - 1) * 100


def period_changes(burden):
    selected = burden.query("sex=='both'")
    pivot = selected.pivot(index=["measure", "location", "organ"], columns="year", values="ageStdRate")
    result = pivot.reset_index()
    for year in [2019, 2020, 2021, 2023]:
        baseline = 2000 if year in [2019, 2023] else 2019
        result[f"change_{baseline}_{year}"] = np.where(
            pivot[baseline].to_numpy() > 0,
            (pivot[year].to_numpy() / pivot[baseline].replace(0, np.nan).to_numpy() - 1) * 100,
            np.nan,
        )
    return result


def decompose_change(total_before, total_after, cause_before, cause_after):
    delta = total_after - total_before
    cause_delta = cause_after - cause_before
    return {
        "change": delta,
        "cause_change": cause_delta,
        "other_change": delta - cause_delta,
        "cause_share_of_net_change_percent": cause_delta / delta * 100 if delta != 0 else np.nan,
    }


def pandemic_decomposition(burden, covid):
    lung = burden.query("location=='WLD' and sex=='both' and organ=='lungs'").set_index(["measure", "year"])
    covid = covid.set_index(["measure", "year"])
    rows = []
    for measure in ["deaths", "dalys"]:
        for year in [2020, 2021]:
            for metric in ["count", "ageStdRate"]:
                values = decompose_change(
                    lung.loc[(measure, 2019), metric],
                    lung.loc[(measure, year), metric],
                    covid.loc[(measure, 2019), metric],
                    covid.loc[(measure, year), metric],
                )
                rows.append(
                    {
                        "measure": measure,
                        "year": year,
                        "metric": metric,
                        "baseline": lung.loc[(measure, 2019), metric],
                        "observed": lung.loc[(measure, year), metric],
                    }
                    | values
                )
    return pd.DataFrame(rows)


def sex_ratios(burden):
    selected = burden[(burden.year == 2023) & ~burden.organ.isin(SEX_EXCLUSIONS)]
    pivot = selected.pivot(
        index=["measure", "location", "organ"], columns="sex", values="ageStdRate"
    ).reset_index()
    pivot["ratio"] = pivot["male"] / pivot["female"].where(pivot["female"] > 0)
    countries = pivot[pivot.location != "WLD"]
    rows = []
    for (measure, organ), group in countries.groupby(["measure", "organ"]):
        ratios = group.ratio.dropna()
        world = pivot[
            (pivot.location == "WLD") & (pivot.measure == measure) & (pivot.organ == organ)
        ].ratio.iloc[0]
        q = ratios.quantile([0.05, 0.25, 0.5, 0.75, 0.95])
        rows.append(
            {
                "measure": measure,
                "organ": organ,
                "world_ratio": world,
                "n": len(ratios),
                "p05": q.loc[0.05],
                "p25": q.loc[0.25],
                "median": q.loc[0.5],
                "p75": q.loc[0.75],
                "p95": q.loc[0.95],
            }
        )
    return pivot, pd.DataFrame(rows)


def age_concentration(ages):
    """Observed 70+ death share, not an inferred mean age or causal explanation."""
    selected = ages.query("measure=='deaths' and age_group!='all'")
    total = selected.groupby(["location", "organ"])["count"].sum(min_count=1)
    old = selected.query("age_group=='70_plus'").set_index(["location", "organ"])["count"]
    return (old / total.where(total > 0) * 100).rename("share_70_plus").reset_index()
