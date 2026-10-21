"""Generate a small, FAKE but schema-correct dataset (see README.md) for web development and tests.

The numbers are synthetic and have no epidemiological meaning.
Run: py -m uv run --project ../pipeline python make_fixture.py
"""

import json
import math
import random
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / "fixtures" / "data"

YEARS = [2000, 2010, 2015, 2019, 2020, 2021, 2022, 2023]
SEXES = [("both", "Both sexes"), ("male", "Male"), ("female", "Female")]
AGES = [("all", "All ages"), ("0_4", "0–4"), ("5_14", "5–14"), ("15_29", "15–29"),
        ("30_49", "30–49"), ("50_59", "50–59"), ("60_69", "60–69"), ("70_plus", "70+")]
AGE_SHARE = {"0_4": 0.08, "5_14": 0.16, "15_29": 0.24, "30_49": 0.27, "50_59": 0.11, "60_69": 0.08, "70_plus": 0.06}
AGE_RISK = {"0_4": 0.6, "5_14": 0.05, "15_29": 0.1, "30_49": 0.3, "50_59": 1.0, "60_69": 2.5, "70_plus": 8.0}
STD_WEIGHT = {"0_4": 7.21, "5_14": 14.24, "15_29": 21.35, "30_49": 25.94, "50_59": 11.16, "60_69": 9.40, "70_plus": 10.72}
MEASURES = [("deaths", "Deaths"), ("dalys", "DALYs (disability-adjusted life years)")]
LOCATIONS = [("WLD", "World", "world", 8_100_000_000), ("USA", "United States of America", "country", 340_000_000),
             ("IND", "India", "country", 1_430_000_000), ("NGA", "Nigeria", "country", 225_000_000),
             ("JPN", "Japan", "country", 124_000_000)]
FAKE_CAUSES = [(1130, "Ischaemic heart disease", "heart"), (1140, "Stroke", "brain"),
               (1180, "COPD", "lungs"), (1220, "Cirrhosis of the liver", "liver"),
               (630, "Trachea, bronchus, lung cancers", "lungs"), (1270, "Kidney diseases", "kidneys"),
               (800, "Diabetes mellitus", "diabetes_endocrine"), (1530, "Road injury", "injuries")]


def sig(x: float, digits: int = 4) -> float:
    if x == 0:
        return 0.0
    return round(x, -int(math.floor(math.log10(abs(x)))) + digits - 1)


def main() -> None:
    rng = random.Random(42)
    organs = [o["id"] for o in json.loads((HERE / "organs.json").read_text(encoding="utf-8"))["organs"]]
    base = {o: rng.uniform(1, 120) for o in organs}
    base["heart"], base["brain"], base["lungs"] = 180.0, 110.0, 90.0

    domains: dict[str, list[float]] = {}
    summary: dict[int, dict] = {y: {} for y in YEARS}

    for loc_id, _, _, pop_total in LOCATIONS:
        loc_factor = rng.uniform(0.6, 1.5)
        population: dict = {}
        values: dict = {m: {} for m, _ in MEASURES}
        top: dict = {m: {} for m, _ in MEASURES}
        for yi, year in enumerate(YEARS):
            trend = 1.0 - 0.01 * yi + (0.08 if year in (2020, 2021) else 0)
            population[str(year)] = {}
            for sex, _ in SEXES:
                sex_factor = {"both": 1.0, "male": 1.1, "female": 0.9}[sex]
                sex_pop = pop_total * (1.0 if sex == "both" else 0.5)
                population[str(year)][sex] = {"all": round(sex_pop)} | {a: round(sex_pop * s) for a, s in AGE_SHARE.items()}
            for measure, _ in MEASURES:
                mfac = 1.0 if measure == "deaths" else 35.0
                values[measure][str(year)] = {}
                top[measure][str(year)] = {}
                for sex, _ in SEXES:
                    sex_factor = {"both": 1.0, "male": 1.1, "female": 0.9}[sex]
                    block: dict = {}
                    age_rates: dict[str, list[float]] = {}
                    counts_all = [0.0] * len(organs)
                    for age, share in AGE_SHARE.items():
                        pop = population[str(year)][sex][age]
                        rates = []
                        for o in organs:
                            if (sex == "male" and o in ("breast", "uterus_cervix", "ovaries")) or \
                               (sex == "female" and o in ("prostate", "testes")):
                                rates.append(0.0)
                                continue
                            rates.append(base[o] * AGE_RISK[age] * loc_factor * trend * sex_factor * mfac * rng.uniform(0.9, 1.1))
                        age_rates[age] = rates
                        counts = [r * pop / 100_000 for r in rates]
                        counts_all = [a + b for a, b in zip(counts_all, counts)]
                        block[age] = {"count": [sig(c) for c in counts], "rate": [sig(r) for r in rates]}
                    pop_all = population[str(year)][sex]["all"]
                    crude = [c / pop_all * 100_000 for c in counts_all]
                    wsum = sum(STD_WEIGHT.values())
                    std = [sum(age_rates[a][i] * w for a, w in STD_WEIGHT.items()) / wsum for i in range(len(organs))]
                    # Mark one deliberately missing value so the UI must handle null.
                    std_out: list[float | None] = [sig(v) for v in std]
                    if loc_id == "NGA" and measure == "dalys":
                        std_out[organs.index("ears")] = None
                    block = {"all": {"count": [sig(c) for c in counts_all], "rate": [sig(r) for r in crude], "ageStdRate": std_out}} | block
                    values[measure][str(year)][sex] = block
                    top[measure][str(year)][sex] = {
                        organ: [{"code": code, "count": sig(counts_all[organs.index(organ)]), "rate": sig(crude[organs.index(organ)])}]
                        for code, _, organ in FAKE_CAUSES
                    }
                    for metric, arr in (("count", counts_all), ("rate", crude), ("ageStdRate", std)):
                        key = f"{measure}.{metric}"
                        lo, hi = domains.get(key, [math.inf, -math.inf])
                        vals = [v for v in arr if v > 0]
                        domains[key] = [min(lo, min(vals)), max(hi, max(vals))]
                    summary[year].setdefault(measure, {}).setdefault(sex, {"ageStdRate": [], "rate": []})
                    summary[year][measure][sex]["ageStdRate"].append(std_out)
                    summary[year][measure][sex]["rate"].append([sig(r) for r in crude])

        write(OUT / "locations" / f"{loc_id}.json", {
            "schemaVersion": 1, "location": loc_id, "population": population, "values": values, "topCauses": top,
        })

    for year in YEARS:
        write(OUT / "summary" / f"{year}.json", {
            "schemaVersion": 1, "year": year, "locations": [l[0] for l in LOCATIONS], "values": summary[year],
        })

    write(OUT / "causes.json", {
        "schemaVersion": 1, "mappingVersion": "0.0.0-fixture",
        "causes": [{"code": c, "name": n, "parent": None, "level": 3, "organ": o, "relation": "primary",
                    "rationale": "fixture"} for c, n, o in FAKE_CAUSES],
    })

    write(OUT / "manifest.json", {
        "schemaVersion": 1,
        "datasetRelease": "FIXTURE (synthetic data, not WHO estimates)",
        "mappingVersion": "0.0.0-fixture",
        "generatedAt": "2026-10-20T00:00:00Z",
        "standardPopulation": "WHO2026",
        "years": YEARS,
        "sexes": [{"id": s, "label": l} for s, l in SEXES],
        "ageGroups": [{"id": a, "label": l} for a, l in AGES],
        "measures": [{"id": m, "label": l} for m, l in MEASURES],
        "metrics": [{"id": "count", "label": "Total"}, {"id": "rate", "label": "Rate per 100,000"},
                    {"id": "ageStdRate", "label": "Age-standardized rate per 100,000", "ageGroups": ["all"]}],
        "organs": organs,
        "locations": [{"id": i, "name": n, "kind": k} for i, n, k, _ in LOCATIONS],
        "colorDomains": {k: [sig(v[0]), sig(v[1])] for k, v in sorted(domains.items())},
        "provenance": {"sources": [{"id": "fixture", "citation": "Synthetic fixture data generated by contracts/make_fixture.py",
                                    "url": "", "terms": "", "retrievedAt": "2026-10-20"}],
                       "notes": ["Synthetic numbers for development only."]},
    })
    print(f"fixture written to {OUT}")


def write(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()
