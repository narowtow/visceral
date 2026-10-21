"""Audit the published JSON against unrounded source totals and inspect world rankings."""

import math
from pathlib import Path

from .contract import read_json


def export_stats(output):
    output = Path(output)
    files = sorted(output.rglob("*.json"))
    largest = max(files, key=lambda p: p.stat().st_size)
    return {
        "files": len(files),
        "bytes": sum(p.stat().st_size for p in files),
        "largest_file": str(largest.relative_to(output)),
        "largest_bytes": largest.stat().st_size,
    }


def sanity_checks(con, output):
    output = Path(output)
    ranking = (
        con.execute("""
        SELECT organ,count FROM organ_burden WHERE location='WLD' AND measure='deaths'
          AND year=2023 AND sex='both' AND age_group='all' ORDER BY count DESC,organ LIMIT 10
    """)
        .df()
        .to_dict("records")
    )
    causes = (
        con.execute("""
        SELECT c.cause_code,m.name,c.value FROM primary_world c JOIN cause_map m ON m.code=c.cause_code
        WHERE location='WLD' AND measure='deaths' AND year=2023 AND sex='both' AND age_group='all'
        ORDER BY value DESC,cause_code LIMIT 10
    """)
        .df()
        .to_dict("records")
    )
    comparisons = []
    for location in ["WLD", "USA", "IND", "NGA", "JPN"]:
        path = output / "locations" / f"{location}.json"
        if not path.exists():
            continue
        document = read_json(path)
        for year in [2000, 2023]:
            for measure in ["deaths", "dalys"]:
                if str(year) not in document["values"][measure]:
                    continue
                values = document["values"][measure][str(year)]["both"]["all"]["count"]
                expected = con.execute(
                    """
                    SELECT sum(value) FROM observations WHERE measure=? AND year=? AND sex='both'
                      AND age_group='all' AND cause_code=0 AND (?='WLD' OR location=?)
                """,
                    [measure, year, location, location],
                ).fetchone()[0]
                if any(value is None for value in values):
                    actual, error, allowed = None, None, None
                else:
                    actual = sum(values)
                    error = actual - expected
                    allowed = (
                        0.01
                        + 1e-6 * expected
                        + sum(
                            0.5 * 10 ** (math.floor(math.log10(abs(value))) - 3) for value in values if value
                        )
                    )
                    if abs(error) > allowed:
                        raise ValueError(f"Export totals fail reconciliation: {location}/{measure}/{year}")
                comparisons.append(
                    {
                        "location": location,
                        "measure": measure,
                        "year": year,
                        "who_all_causes": expected,
                        "exported_organ_sum": actual,
                        "difference": error,
                        "rounding_tolerance": allowed,
                    }
                )
    return {
        "world_2023_top_10_groups_by_deaths": ranking,
        "world_2023_top_10_primary_causes_by_deaths": causes,
        "exported_totals_vs_all_causes": comparisons,
    }
