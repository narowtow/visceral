"""Small synthetic examples and the checked-in mapping; no interim data or network needed."""

import json

import numpy as np
import pandas as pd
import pytest

from visceral_pipeline.analysis.clustering import bootstrap_stability, choose_k, feature_matrix
from visceral_pipeline.analysis.comparisons import (
    age_concentration,
    decompose_change,
    percent_change,
    rank_comparison,
    rank_correlations,
    sex_ratios,
)
from visceral_pipeline.analysis.publish import write_json
from visceral_pipeline.analysis.sensitivity import alternative_mapping, mapping_comparison, reweight_rates
from visceral_pipeline.constants import CONFIG, ROOT
from visceral_pipeline.mapping import load_mapping, validate_mapping
from visceral_pipeline.standardize import load_weights, standardize


def test_rank_ties_direction_and_paired_missingness():
    frame = pd.DataFrame(
        {
            "measure": ["synthetic"] * 4,
            "location": ["A", "B", "C", "D"],
            "crude": [10.0, 20.0, 20.0, 99.0],
            "adjusted": [30.0, 20.0, 10.0, np.nan],
        }
    )
    ranks = rank_comparison(frame, "crude", "adjusted", ["measure"]).set_index("location")
    assert ranks.index.tolist() == ["A", "B", "C"]
    assert ranks.rank_a.tolist() == [3.0, 1.5, 1.5]
    assert ranks.rank_b.tolist() == [1.0, 2.0, 3.0]
    assert ranks.loc["A", "rank_change"] == 2
    result = rank_correlations(ranks.reset_index(), ["measure"]).iloc[0]
    assert result.rho == pytest.approx(-np.sqrt(3) / 2)
    constant = rank_comparison(frame.assign(adjusted=1), "crude", "adjusted", ["measure"])
    assert pd.isna(rank_correlations(constant, ["measure"]).rho.iloc[0])


def test_reweighting_hand_math_missing_values_and_invalid_weights():
    rates = pd.DataFrame({"young": [10.0, 10.0], "old": [100.0, np.nan]}, index=["known", "missing"])
    adjusted = reweight_rates(rates, {"young": 0.75, "old": 0.25})
    assert adjusted["known"] == 32.5
    assert pd.isna(adjusted["missing"])
    assert reweight_rates(rates, {"young": 0.25, "old": 0.75})["known"] == 77.5
    with pytest.raises(ValueError, match="sum to one"):
        reweight_rates(rates, {"young": 0.5, "old": 0.8})
    with pytest.raises(ValueError, match="Missing age"):
        reweight_rates(rates.drop(columns="old"), {"young": 0.75, "old": 0.25})
    with pytest.raises(ValueError, match="nonnegative"):
        reweight_rates(rates.assign(young=-1), {"young": 0.75, "old": 0.25})
    # Every transcribed standard follows the same pure standardization function.
    for name in ["WHO2026", "WHO2021", "Segi", "Scandinavian", "European2013"]:
        weights = load_weights(name)
        row = {age: float(i**2) for i, age in enumerate(weights)}
        assert reweight_rates(pd.DataFrame([row]), weights).iloc[0] == pytest.approx(
            standardize(row, weights)
        )


def test_bootstrap_stability_recovers_separated_synthetic_profiles():
    rng = np.random.default_rng(8)
    values = np.vstack([rng.normal(-5, 0.02, (20, 3)), rng.normal(5, 0.02, (20, 3))])
    labels = np.repeat([0, 1], 20)
    scores = bootstrap_stability(values, 2, labels, resamples=12, seed=12)
    np.testing.assert_allclose(scores, 1)
    np.testing.assert_array_equal(scores, bootstrap_stability(values, 2, 1 - labels, resamples=12, seed=12))
    with pytest.raises(ValueError, match="dimensions"):
        bootstrap_stability(values, 2, labels[:-1])
    diagnostics = pd.DataFrame(
        {
            "k": [2, 3, 4],
            "silhouette": [0.50, 0.51, 0.60],
            "ari_median": [0.95, 0.9, 0.7],
            "ari_p05": [0.9, 0.7, 0.6],
            "min_size": [20, 10, 5],
        }
    )
    assert choose_k(diagnostics) == (2, True)


def test_feature_transforms_preserve_missingness_rule_and_remove_constants():
    rates = pd.DataFrame({"heart": [1.0, 3.0, 5.0], "lungs": [2.0, 4.0, 8.0], "empty": [0.0, 0.0, 0.0]})
    features = feature_matrix(rates)
    assert list(features) == ["heart", "lungs"]
    assert features.heart.iloc[0] == pytest.approx(np.log(2))
    shares = feature_matrix(rates, "composition")
    np.testing.assert_allclose(shares.sum(axis=1), 1)
    with pytest.raises(ValueError, match="no imputation"):
        feature_matrix(rates.assign(heart=np.nan))
    with pytest.raises(ValueError, match="zero total"):
        feature_matrix(rates * 0, "composition")


def test_alternative_mapping_keeps_the_primary_partition():
    ids = [o["id"] for o in json.loads((ROOT / "contracts/organs.json").read_text())["organs"]]
    base = load_mapping(ids)
    alternative = alternative_mapping(base, ids)
    validate_mapping(alternative, ids)
    pd.testing.assert_series_equal(base.relation, alternative.relation)
    pd.testing.assert_series_equal(base.parent, alternative.parent)
    nodes = alternative.set_index("code")
    leaves = set(nodes.index) - set(alternative.parent.dropna())
    for leaf in leaves:
        cursor = leaf
        coverage = 0
        while pd.notna(cursor):
            coverage += nodes.loc[cursor, "relation"] == "primary"
            cursor = nodes.loc[cursor, "parent"]
        assert coverage == 1
    assert nodes.loc[30, "organ"] == nodes.loc[395, "organ"] == "infections_systemic"
    assert nodes.loc[800, "organ"] == "pancreas"
    assert nodes.loc[820, "organ"] == "brain"
    assert nodes.loc[1120, "organ"] == "heart"
    assert nodes.loc[1160, "organ"] == "other_unallocated"
    checked_in = pd.read_csv(CONFIG / "cause_map_alt.csv")
    pd.testing.assert_frame_equal(checked_in, alternative, check_dtype=False)


def test_mapping_shares_and_ranks_with_constant_underlying_counts():
    base = pd.DataFrame(
        {
            "measure": ["deaths"] * 2,
            "location": ["SYN"] * 2,
            "year": [2023] * 2,
            "sex": ["both"] * 2,
            "organ": ["heart", "pancreas"],
            "count": [90.0, 10.0],
            "ageStdRate": [90.0, 10.0],
        }
    )
    alternate = base.assign(count=[30.0, 70.0], ageStdRate=[30.0, 70.0])
    result = mapping_comparison(base, alternate).set_index("organ")
    assert result.loc["pancreas", "rank_change"] == 1
    assert result.count_share_base.sum() == result.count_share_alt.sum() == 100
    assert result.loc["pancreas", "count_share_alt"] == 70
    with pytest.raises(ValueError, match="changes underlying count"):
        mapping_comparison(base, alternate.assign(count=[30.0, 80.0]))


def test_additive_accounting_above_one_hundred_is_not_truncated():
    result = decompose_change(100, 150, 0, 60)
    assert result == {
        "change": 50,
        "cause_change": 60,
        "other_change": -10,
        "cause_share_of_net_change_percent": 120,
    }
    assert pd.isna(percent_change(0, 20))
    assert percent_change(100, 80) == pytest.approx(-20)


def test_sex_exclusions_zero_denominators_and_observed_age_share():
    rows = []
    for location in ["WLD", "SYN"]:
        for organ in ["heart", "prostate", "breast", "maternal_neonatal", "muscles"]:
            for sex, value in [("both", 2), ("male", 3), ("female", 1 if organ != "muscles" else 0)]:
                rows.append(
                    {
                        "location": location,
                        "measure": "deaths",
                        "year": 2023,
                        "organ": organ,
                        "sex": sex,
                        "ageStdRate": value,
                    }
                )
    ratios, summary = sex_ratios(pd.DataFrame(rows))
    assert set(ratios.organ) == {"heart", "muscles"}
    assert ratios.query("organ=='heart'").ratio.eq(3).all()
    assert ratios.query("organ=='muscles'").ratio.isna().all()
    assert summary.set_index("organ").loc["muscles", "n"] == 0
    ages = pd.DataFrame(
        {
            "measure": ["deaths"] * 3,
            "location": ["SYN"] * 3,
            "organ": ["heart"] * 3,
            "age_group": ["all", "0_4", "70_plus"],
            "count": [100, 25, 75],
        }
    )
    assert age_concentration(ages).share_70_plus.iloc[0] == 75


def test_chart_json_is_compact_four_significant_digits_and_null_for_missing(tmp_path):
    path = tmp_path / "synthetic.json"
    write_json(
        path,
        {
            "schemaVersion": 1,
            "id": "synthetic",
            "title": "SYNTHETIC",
            "description": "test only",
            "data": [{"value": np.float64(12345), "missing": np.nan}],
        },
    )
    result = json.loads(path.read_text())
    assert result["data"] == [{"value": 12340, "missing": None}]
    assert "NaN" not in path.read_text()
    with pytest.raises(ValueError, match="200 KB"):
        write_json(path, {"data": ["x" * 200000]})
