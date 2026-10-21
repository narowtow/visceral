"""Shared strict shape checks for real exports and the synthetic contract fixture."""

import json
import math
from pathlib import Path


def finite_tree(value):
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError("Non-finite JSON number")
    if isinstance(value, dict):
        for child in value.values():
            finite_tree(child)
    elif isinstance(value, list):
        for child in value:
            finite_tree(child)


def read_json(path):
    value = json.loads(
        Path(path).read_text(encoding="utf-8"), parse_constant=lambda s: (_ for _ in ()).throw(ValueError(s))
    )
    finite_tree(value)
    return value


def validate_export(directory, expected_organs):
    directory = Path(directory)
    manifest = read_json(directory / "manifest.json")
    assert manifest["schemaVersion"] == 1
    assert manifest["organs"] == expected_organs
    assert manifest["standardPopulation"] == "WHO2026"
    assert manifest["datasetRelease"] and manifest["mappingVersion"] and manifest["generatedAt"]
    assert manifest["provenance"]["sources"]
    ids = lambda key: [item["id"] for item in manifest[key]]
    sexes, ages, measures = ids("sexes"), ids("ageGroups"), ids("measures")
    assert sexes == ["both", "male", "female"]
    assert ages == ["all", "0_4", "5_14", "15_29", "30_49", "50_59", "60_69", "70_plus"]
    assert measures == ["deaths", "dalys"]
    assert ids("metrics") == ["count", "rate", "ageStdRate"]
    locations = ids("locations")
    assert locations[0] == "WLD" and len(set(locations)) == len(locations)
    years = [str(y) for y in manifest["years"]]
    causes = read_json(directory / "causes.json")
    assert causes["schemaVersion"] == 1 and causes["mappingVersion"] == manifest["mappingVersion"]
    codes = {c["code"] for c in causes["causes"]}
    assert len(codes) == len(causes["causes"])
    for cause in causes["causes"]:
        assert {"code", "name", "parent", "level", "organ", "relation", "rationale"} <= cause.keys()
        assert cause["relation"] in {"primary", "none"}
        assert cause["organ"] is None or cause["organ"] in expected_organs
    for key in (f"{m}.{metric}" for m in measures for metric in ["count", "rate", "ageStdRate"]):
        domain = manifest["colorDomains"][key]
        assert len(domain) == 2 and 0 <= domain[0] <= domain[1]

    def array(arr):
        assert isinstance(arr, list) and len(arr) == len(expected_organs)
        assert all(
            v is None or (isinstance(v, (int, float)) and not isinstance(v, bool) and v >= 0) for v in arr
        )

    for location in locations:
        data = read_json(directory / "locations" / f"{location}.json")
        assert data["schemaVersion"] == 1 and data["location"] == location
        assert set(data["population"]) == set(years)
        assert set(data["values"]) == set(measures)
        for year in years:
            assert set(data["population"][year]) == set(sexes)
            for sex in sexes:
                assert set(data["population"][year][sex]) == set(ages)
                for value in data["population"][year][sex].values():
                    assert value is None or value >= 0
                for measure in measures:
                    block = data["values"][measure][year][sex]
                    assert set(block) == set(ages)
                    for age in ages:
                        assert set(block[age]) == (
                            {"count", "rate", "ageStdRate"} if age == "all" else {"count", "rate"}
                        )
                        for arr in block[age].values():
                            array(arr)
                    top = data["topCauses"][measure][year][sex]
                    assert set(top) <= set(expected_organs)
                    for entries in top.values():
                        assert len(entries) <= 5
                        previous = math.inf
                        for entry in entries:
                            assert set(entry) == {"code", "count", "rate"} and entry["code"] in codes
                            if entry["count"] is not None:
                                assert 0 <= entry["count"] <= previous
                                previous = entry["count"]
                            assert entry["rate"] is None or entry["rate"] >= 0
    for year in manifest["years"]:
        data = read_json(directory / "summary" / f"{year}.json")
        assert data["schemaVersion"] == 1 and data["year"] == year and data["locations"] == locations
        for measure in measures:
            for sex in sexes:
                assert set(data["values"][measure][sex]) == {"rate", "ageStdRate"}
                for matrix in data["values"][measure][sex].values():
                    assert len(matrix) == len(locations)
                    for row in matrix:
                        array(row)
    return len(locations)
