"""Compute all descriptive tables; rendering and publishing live in separate modules."""

import numpy as np
import pandas as pd

from .clustering import cluster_profiles
from .comparisons import (
    age_concentration,
    pandemic_decomposition,
    period_changes,
    rank_comparison,
    rank_correlations,
    sex_ratios,
)
from .data import write_frame
from .sensitivity import mapping_comparison, standard_sensitivity


def compute_results(inputs, organs, resamples=100):
    burden = inputs["burden"]
    current = burden.query("year==2023 and sex=='both'")
    country = current[current.location != "WLD"]
    names = inputs["locations"].set_index("location")["name"].to_dict() | {"WLD": "World"}
    ranks = rank_comparison(country, "rate", "ageStdRate", ["measure", "organ"])
    ranks = ranks.merge(
        inputs["population_age"].rename(columns={"share_70_plus": "population_70_plus"}),
        on="location",
        validate="many_to_one",
    )
    ranks["name"] = ranks.location.map(names)
    correlations = rank_correlations(ranks, ["measure", "organ"])
    profile = rank_comparison(
        current.query("organ!='muscles'"), "rate", "ageStdRate", ["measure", "location"]
    )
    profile_correlations = rank_correlations(profile, ["measure", "location"])
    ratios, ratio_summary = sex_ratios(burden)
    concentration = age_concentration(inputs["ages"])
    comparison = inputs["method_comparison"].merge(
        concentration, on=["location", "organ"], validate="one_to_one"
    )
    methods = []
    for organ, group in comparison.groupby("organ"):
        relative = group.rel_diff.dropna() * 100
        quantiles = relative.quantile([0.05, 0.5, 0.95])
        world = concentration[
            (concentration.location == "WLD") & (concentration.organ == organ)
        ].share_70_plus.iloc[0]
        valid = group[["rel_diff", "share_70_plus"]].dropna()
        association = (
            valid.rel_diff.rank().corr(valid.share_70_plus.rank())
            if valid.rel_diff.nunique() > 1 and valid.share_70_plus.nunique() > 1
            else np.nan
        )
        methods.append(
            {
                "organ": organ,
                "n": len(relative),
                "p05": quantiles.loc[0.05],
                "median": quantiles.loc[0.5],
                "p95": quantiles.loc[0.95],
                "world_70_plus_share": world,
                "within_organ_age_rho": association,
            }
        )
    standard_rates, standard_ranks, standard_correlations, standard_world = standard_sensitivity(
        inputs["ages"]
    )
    feature_rates = (
        country.query("measure=='deaths'")
        .pivot(index="location", columns="organ", values="ageStdRate")
        .sort_index()
        .sort_index(axis=1)
    )
    membership, diagnostics, centroids, cluster_meta = cluster_profiles(feature_rates, resamples=resamples)
    membership["name"] = membership.location.map(names)
    profiles = []
    for cluster, group in centroids.groupby("cluster"):
        above = group.nlargest(3, "z").organ.tolist()
        below = group.nsmallest(3, "z").organ.tolist()
        profiles.append(
            {
                "cluster": int(cluster),
                "n": int(group.n.iloc[0]),
                "higher_features": above,
                "lower_features": below,
            }
        )
    cluster_meta["profiles"] = profiles
    methods = pd.DataFrame(methods)
    age_bias = methods[["median", "world_70_plus_share"]].dropna()
    meta = {
        "clustering": cluster_meta,
        "countries": len(feature_rates),
        "organ_groups": len(organs),
        "age_bias_group_rho": age_bias["median"].rank().corr(age_bias.world_70_plus_share.rank()),
        "observations": int(inputs["coverage"].rows.sum()),
        "years": sorted(int(y) for y in burden.year.unique()),
        "methods": {
            "country_deaths": "WHO-published fine-age cause ASDR sums",
            "dalys_and_world": "Visceral WHO2026 broad-bin direct standardization",
        },
        "sex_exclusions": ["breast", "prostate", "testes", "uterus_cervix", "ovaries", "maternal_neonatal"],
        "bootstrap_note": "Country resampling assesses algorithmic stability, not uncertainty in WHO point estimates.",
    }
    frames = {
        "country_ranks": ranks,
        "rank_correlations": correlations,
        "profile_ranks": profile,
        "profile_correlations": profile_correlations,
        "trends": period_changes(burden),
        "world_trends": burden.query("sex=='both' and location=='WLD'"),
        "pandemic": pandemic_decomposition(burden, inputs["covid"]),
        "sex_ratios": ratios,
        "sex_summary": ratio_summary,
        "concentration": concentration,
        "methods_country": comparison,
        "methods_summary": methods,
        "standard_rates": standard_rates,
        "standard_ranks": standard_ranks,
        "standard_correlations": standard_correlations,
        "standard_world": standard_world,
        "mapping": mapping_comparison(current, inputs["alternative"]),
        "cluster_membership": membership,
        "cluster_diagnostics": diagnostics,
        "cluster_centroids": centroids,
    }
    for name, frame in frames.items():
        write_frame(name, frame)
    return frames, meta
