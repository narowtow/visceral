"""Direct standardization, with no imputation or renormalizing around missing rates."""

import math
from collections.abc import Mapping

import pandas as pd

from .constants import CONFIG

BINS = {
    "0_4": (0, 4),
    "5_14": (5, 14),
    "15_29": (15, 29),
    "30_49": (30, 49),
    "50_59": (50, 59),
    "60_69": (60, 69),
    "70_plus": (70, 200),
}


def collapse_weights(standard: Mapping[str, float]) -> dict[str, float]:
    weights = dict.fromkeys(BINS, 0.0)
    expected = {f"{a}-{a + 4}" for a in range(0, 85, 5)} | {"85+"}
    if set(standard) != expected:
        raise ValueError("Standard must contain every five-year band through 85+")
    for age, weight in standard.items():
        if not math.isfinite(weight) or weight < 0:
            raise ValueError("Standard weights must be finite and non-negative")
        lower = int(age.rstrip("+").split("-")[0])
        group = next(k for k, (lo, hi) in BINS.items() if lo <= lower <= hi)
        weights[group] += weight
    total = sum(weights.values())
    if total <= 0:
        raise ValueError("Standard has no positive weight")
    return {age: weight / total for age, weight in weights.items()}


def standardize(rates: Mapping[str, float | None], weights: Mapping[str, float]) -> float | None:
    if not weights or any(not math.isfinite(w) or w < 0 for w in weights.values()):
        raise ValueError("Invalid weights")
    if not math.isclose(sum(weights.values()), 1, abs_tol=1e-10):
        raise ValueError("Weights must sum to one")
    if any(rates.get(age) is None or not math.isfinite(rates[age]) for age in weights):
        return None
    if any(rates[age] < 0 for age in weights):
        raise ValueError("Rates must be non-negative")
    return sum(rates[age] * weight for age, weight in weights.items())


def load_weights(name="WHO2026"):
    standard = pd.read_csv(CONFIG / "standard_populations.csv").set_index("age_group")[name]
    return collapse_weights(standard.to_dict())
