"""Analysis input preparation from validated interim files; production exports stay untouched."""

import json
from pathlib import Path

import duckdb

from ..aggregate import aggregate
from ..constants import CONFIG, INTERIM, ROOT
from ..mapping import load_mapping
from ..storage import copy_parquet
from .sensitivity import alternative_mapping

CACHE = INTERIM / "analysis"
RESULT_NAMES = [
    "country_ranks",
    "rank_correlations",
    "profile_ranks",
    "profile_correlations",
    "trends",
    "world_trends",
    "pandemic",
    "sex_ratios",
    "sex_summary",
    "concentration",
    "methods_country",
    "methods_summary",
    "standard_rates",
    "standard_ranks",
    "standard_correlations",
    "standard_world",
    "mapping",
    "cluster_membership",
    "cluster_diagnostics",
    "cluster_centroids",
]


def write_frame(name, frame, directory=CACHE):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    with duckdb.connect() as con:
        copy_parquet(con, frame, directory / f"{name}.parquet")


def read_frame(name, directory=CACHE):
    with duckdb.connect() as con:
        return con.execute("SELECT * FROM read_parquet(?)", [str(Path(directory) / f"{name}.parquet")]).df()


def prepare_inputs():
    from ..cli import load_cache

    organs = json.loads((ROOT / "contracts/organs.json").read_text(encoding="utf-8"))["organs"]
    ids = [o["id"] for o in organs]
    mapping = load_mapping(ids)
    alt = alternative_mapping(mapping, ids)
    alt.to_csv(CONFIG / "cause_map_alt.csv", index=False)
    CACHE.mkdir(parents=True, exist_ok=True)
    frames = {}
    with duckdb.connect() as con:
        con.execute("SET threads=4")
        _, locations = load_cache(con)
        aggregate(con, mapping, ids)
        frames["burden"] = con.execute("SELECT * FROM organ_burden WHERE age_group='all'").df()
        frames["ages"] = con.execute("SELECT * FROM organ_rates WHERE year=2023 AND sex='both'").df()
        frames["covid"] = con.execute("""SELECT measure,year,
            max(value) FILTER(WHERE age_group='all') AS count,
            sum(value/population*100000*weight) AS ageStdRate
            FROM primary_world JOIN population_world USING(year,location,sex,age_group)
            LEFT JOIN standard_weights USING(age_group)
            WHERE cause_code=395 AND location='WLD' AND sex='both' GROUP BY measure,year""").df()
        frames["coverage"] = (
            con.execute("""SELECT measure,year,count(*) AS rows,count(*) FILTER(WHERE value IS NULL) missing
            FROM observations GROUP BY measure,year ORDER BY measure,year""").df()
        )
        frames["population_age"] = con.execute("""SELECT location,
            max(population) FILTER(WHERE age_group='70_plus')/max(population) FILTER(WHERE age_group='all')*100 AS share_70_plus,
            max(population) FILTER(WHERE age_group='all') AS population
            FROM population_world WHERE year=2023 AND sex='both' GROUP BY location""").df()
        frames["locations"] = locations
        frames["method_comparison"] = con.execute(
            "SELECT * FROM read_parquet(?) WHERE year=2023 AND sex='both'",
            [str(INTERIM / "deaths_asdr_method_comparison.parquet")],
        ).df()
        aggregate(con, alt, ids)
        frames["alternative"] = con.execute(
            "SELECT * FROM organ_burden WHERE age_group='all' AND year=2023 AND sex='both'"
        ).df()
    for name, frame in frames.items():
        write_frame(name, frame)
    return frames, organs


def load_inputs(directory=CACHE):
    names = [
        "burden",
        "ages",
        "covid",
        "coverage",
        "population_age",
        "locations",
        "method_comparison",
        "alternative",
    ]
    return {name: read_frame(name, directory) for name in names}


def load_results(directory=CACHE):
    return {name: read_frame(name, directory) for name in RESULT_NAMES}
