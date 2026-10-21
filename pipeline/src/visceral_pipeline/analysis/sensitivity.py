"""Alternative cause attribution and standard-population sensitivity."""

import numpy as np
import pandas as pd

from ..mapping import validate_mapping
from ..standardize import load_weights, standardize
from .comparisons import rank_comparison, rank_correlations

STANDARDS = ["WHO2026", "WHO2021", "Segi", "Scandinavian", "European2013"]


def alternative_mapping(base, organs):
    result = base.copy()
    assignments = {30: "infections_systemic", 395: "infections_systemic", 800: "pancreas", 820: "brain"}
    nodes = base.set_index("code")
    for index, row in result.iterrows():
        cursor = row.code
        while pd.notna(cursor):
            if cursor in assignments:
                result.loc[index, "organ"] = assignments[cursor]
                result.loc[index, "rationale"] = (
                    f"Sensitivity scenario only: primary code {int(cursor)} reassigned to "
                    f"{assignments[cursor]}; includes its descendants. Not a claim about all affected tissues."
                )
                break
            cursor = nodes.loc[cursor, "parent"]
    validate_mapping(result, organs)
    return result


def reweight_rates(wide, weights):
    """Direct standardization of age-rate columns; missing ages propagate."""
    standardize(dict.fromkeys(weights, 0.0), weights)
    if not set(weights) <= set(wide.columns):
        raise ValueError("Missing age bands")
    matrix = wide.loc[:, list(weights)].to_numpy(dtype=float)
    if np.isinf(matrix).any() or (matrix < 0).any():
        raise ValueError("Age rates must be finite nonnegative values or missing")
    return pd.Series(matrix @ np.array(list(weights.values())), index=wide.index, name="ageStdRate")


def standard_sensitivity(ages):
    wide = ages.query("age_group!='all'").pivot(
        index=["measure", "location", "organ"], columns="age_group", values="rate"
    )
    parts = []
    for standard in STANDARDS:
        part = reweight_rates(wide, load_weights(standard)).reset_index()
        part["standard"] = standard
        parts.append(part)
    rates = pd.concat(parts, ignore_index=True)
    baseline = (
        rates[rates.standard == "WHO2026"].rename(columns={"ageStdRate": "baseline"}).drop(columns="standard")
    )
    rates = rates.merge(baseline, on=["measure", "location", "organ"], validate="many_to_one")
    ranks = rank_comparison(
        rates.query("location!='WLD'"), "baseline", "ageStdRate", ["measure", "standard", "organ"]
    )
    correlations = rank_correlations(ranks, ["measure", "standard", "organ"])
    world = rates.query("location=='WLD' and organ!='muscles'").copy()
    world["rank"] = world.groupby(["measure", "standard"]).ageStdRate.rank(method="average", ascending=False)
    return rates, ranks, correlations, world


def mapping_comparison(base, alternative):
    keys = ["measure", "location", "year", "sex", "organ"]
    merged = base.merge(alternative, on=keys, suffixes=("_base", "_alt"), validate="one_to_one")
    groups = ["measure", "location", "year", "sex"]
    for metric in ["count", "ageStdRate"]:
        totals = merged.groupby(groups)[[f"{metric}_base", f"{metric}_alt"]].sum(min_count=1)
        if not np.allclose(totals.iloc[:, 0], totals.iloc[:, 1], rtol=1e-12, atol=1e-7, equal_nan=True):
            raise ValueError(f"Alternative mapping changes underlying {metric} totals")
    merged["rank_base"] = merged.groupby(groups).ageStdRate_base.rank(ascending=False, method="average")
    merged["rank_alt"] = merged.groupby(groups).ageStdRate_alt.rank(ascending=False, method="average")
    merged["rank_change"] = merged.rank_base - merged.rank_alt
    merged["asdr_change_percent"] = (
        merged.ageStdRate_alt / merged.ageStdRate_base.where(merged.ageStdRate_base > 0) - 1
    ) * 100
    totals = merged.groupby(groups)["count_base"].transform("sum")
    merged["count_share_base"] = merged.count_base / totals * 100
    merged["count_share_alt"] = merged.count_alt / totals * 100
    return merged
