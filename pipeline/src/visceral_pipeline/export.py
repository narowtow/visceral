"""Compact deterministic contract JSON, rounded only at the final serialization boundary."""

import json
import math
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd
import yaml

from .constants import AGES, CONFIG, RAW, ROOT
from .contract import validate_export


def sig(value):
    if value is None or pd.isna(value):
        return None
    if not math.isfinite(value):
        raise ValueError("Cannot export infinite values")
    rounded = float(format(value, ".4g"))
    return int(rounded) if rounded.is_integer() and abs(rounded) < 1e16 else rounded


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":")), encoding="utf-8"
    )


def export(con, mapping, location_names, output=ROOT / "web/public/data", generated_at=None):
    output = Path(output)
    organ_meta = json.loads((ROOT / "contracts/organs.json").read_text(encoding="utf-8"))["organs"]
    organs = [o["id"] for o in organ_meta]
    countries = sorted(location_names.location.unique())
    locations = ["WLD", *countries]
    names = location_names.set_index("location")["name"].to_dict()
    years = [row[0] for row in con.execute("SELECT DISTINCT year FROM observations ORDER BY year").fetchall()]
    sexes = ["both", "male", "female"]
    measures = ["deaths", "dalys"]
    summaries = {y: {m: {s: {"ageStdRate": [], "rate": []} for s in sexes} for m in measures} for y in years}
    domain_values = {(m, metric): [] for m in measures for metric in ["count", "rate", "ageStdRate"]}
    organ_indices = [i for i, o in enumerate(organ_meta) if o["kind"] == "organ"]
    for location in locations:
        burden = con.execute("SELECT * FROM organ_burden WHERE location=?", [location]).df()
        lookup = burden.set_index(["measure", "year", "sex", "age_group", "organ"])[
            ["count", "rate", "ageStdRate"]
        ].to_dict("index")
        populations = con.execute("SELECT * FROM population_world WHERE location=?", [location]).df()
        pops = populations.set_index(["year", "sex", "age_group"])["population"].to_dict()
        tops = con.execute("SELECT * FROM top_causes WHERE location=? ORDER BY rank", [location]).df()
        top_lookup = {key: group for key, group in tops.groupby(["measure", "year", "sex", "organ"])}
        population, values, top_causes = {}, {m: {} for m in measures}, {m: {} for m in measures}
        for year in years:
            y = str(year)
            population[y] = {s: {a: sig(pops.get((year, s, a))) for a in AGES.values()} for s in sexes}
            for measure in measures:
                values[measure][y], top_causes[measure][y] = {}, {}
                for sex in sexes:
                    block = {}
                    for age in AGES.values():
                        metrics = ["count", "rate", "ageStdRate"] if age == "all" else ["count", "rate"]
                        block[age] = {}
                        for metric in metrics:
                            raw = [lookup[(measure, year, sex, age, o)][metric] for o in organs]
                            block[age][metric] = [sig(v) for v in raw]
                            domain_values[(measure, metric)].extend(
                                raw[i] for i in organ_indices if pd.notna(raw[i]) and raw[i] > 0
                            )
                    values[measure][y][sex] = block
                    top_causes[measure][y][sex] = {}
                    for organ in organs:
                        group = top_lookup.get((measure, year, sex, organ))
                        top_causes[measure][y][sex][organ] = (
                            []
                            if group is None
                            else [
                                {"code": int(r.cause_code), "count": sig(r.value), "rate": sig(r.rate)}
                                for r in group.itertuples()
                            ]
                        )
                    for metric in ["ageStdRate", "rate"]:
                        summaries[year][measure][sex][metric].append(block["all"][metric])
        write(
            output / "locations" / f"{location}.json",
            {
                "schemaVersion": 1,
                "location": location,
                "population": population,
                "values": values,
                "topCauses": top_causes,
            },
        )
    for year in years:
        write(
            output / "summary" / f"{year}.json",
            {"schemaVersion": 1, "year": year, "locations": locations, "values": summaries[year]},
        )
    cause_records = []
    for row in mapping.itertuples():
        cause_records.append(
            {
                "code": int(row.code),
                "name": row.name,
                "parent": None if pd.isna(row.parent) else int(row.parent),
                "level": int(row.level),
                "organ": None if pd.isna(row.organ) else row.organ,
                "relation": row.relation,
                "rationale": row.rationale,
            }
        )
    write(output / "causes.json", {"schemaVersion": 1, "mappingVersion": "0.1.0", "causes": cause_records})
    source = yaml.safe_load((CONFIG / "sources.yaml").read_text(encoding="utf-8"))["who_ghe_2023"]
    dates = [datetime.fromtimestamp(p.stat().st_mtime, UTC).date().isoformat() for p in RAW.glob("*.xlsx")]
    provenance = [
        {
            "id": f"who_ghe_2023_{m}",
            "citation": source[f"citation_{m}"],
            "url": "https://www.who.int/data/global-health-estimates",
            "terms": source["terms_url"],
            "retrievedAt": max(dates) if dates else None,
        }
        for m in measures
    ]
    manifest = {
        "schemaVersion": 1,
        "datasetRelease": "WHO GHE 2023",
        "mappingVersion": "0.1.0",
        "generatedAt": generated_at or datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "standardPopulation": "WHO2026",
        "years": years,
        "sexes": [{"id": s, "label": label} for s, label in zip(sexes, ["Both sexes", "Male", "Female"])],
        "ageGroups": [{"id": a, "label": label} for label, a in AGES.items()],
        "measures": [
            {"id": "deaths", "label": "Deaths"},
            {"id": "dalys", "label": "DALYs (disability-adjusted life years)"},
        ],
        "metrics": [
            {"id": "count", "label": "Total"},
            {"id": "rate", "label": "Rate per 100,000"},
            {"id": "ageStdRate", "label": "Age-standardized rate per 100,000", "ageGroups": ["all"]},
        ],
        "organs": organs,
        "locations": [
            {
                "id": loc,
                "name": "World" if loc == "WLD" else names[loc],
                "kind": "world" if loc == "WLD" else "country",
            }
            for loc in locations
        ],
        "colorDomains": {
            f"{m}.{metric}": [sig(min(v)), sig(max(v))] if v else [0, 0]
            for (m, metric), v in sorted(domain_values.items())
        },
        "provenance": {
            "sources": provenance,
            "notes": [
                "Colors show burden associated with causes mapped to an organ, not organ health.",
                "World is the sum of included countries; no averaging of country rates.",
                "deaths.ageStdRate for countries: sum of WHO-published cause-specific ASDRs (WHO2026 standard, fine ages).",
                "dalys.ageStdRate and WLD ageStdRate: Visceral broad-age-bin approximation (7 bins), see Methodology. The broad-bin deaths method is retained for sensitivity analysis.",
                "Empty anatomical groups are structural zeros. Missing estimates remain null.",
                "Published intermediate and All Causes totals have documented inconsistencies; organ counts sum primary causes without fabricated residuals.",
                "Retrieval dates are inferred from raw workbook mtimes (UTC); they are not release dates.",
            ],
        },
    }
    write(output / "manifest.json", manifest)
    validate_export(output, organs)
    files = list(output.rglob("*.json"))
    size = sum(p.stat().st_size for p in files)
    largest = max(files, key=lambda p: p.stat().st_size)
    if size > 60_000_000:
        raise ValueError(
            f"Export is {size:,} bytes; publication stopped. Proposed contract-compatible fix: "
            "reduce topCauses from five to three per organ after reviewing the measured payload."
        )
    return {
        "files": len(files),
        "bytes": size,
        "largest_file": str(largest.relative_to(output)),
        "largest_bytes": largest.stat().st_size,
    }
