"""Pandera canonical schemas and measured reconciliation diagnostics."""

import json

import pandas as pd
import pandera.pandas as pa

from .constants import AGES, CONFIG, MEASURES, YEARS
from .standardize import load_weights

KEYS = ["measure", "year", "location", "sex", "age_group", "cause_code"]
POP_KEYS = ["year", "location", "sex", "age_group"]


def schemas():
    dimensions = {
        "year": pa.Column(int, pa.Check.isin(YEARS)),
        "location": pa.Column(str, pa.Check.str_matches(r"^[A-Z]{3}$")),
        "sex": pa.Column(str, pa.Check.isin(["both", "male", "female"])),
        "age_group": pa.Column(str, pa.Check.isin(list(AGES.values()))),
    }
    observations = pa.DataFrameSchema(
        dimensions
        | {
            "measure": pa.Column(str, pa.Check.isin(MEASURES)),
            "cause_code": pa.Column(int, pa.Check.ge(0)),
            "value": pa.Column(
                float,
                [pa.Check.ge(0), pa.Check(lambda s: ~s.isin([float("inf"), -float("inf")]))],
                nullable=True,
            ),
        },
        unique=KEYS,
        strict=True,
        coerce=True,
    )
    population = pa.DataFrameSchema(
        dimensions
        | {
            "population": pa.Column(
                float,
                [pa.Check.gt(0), pa.Check(lambda s: ~s.isin([float("inf"), -float("inf")]))],
                nullable=True,
            )
        },
        unique=POP_KEYS,
        strict=True,
        coerce=True,
    )
    return observations, population


def distribution(frame, actual="actual", expected="expected"):
    valid = frame[[actual, expected]].dropna()
    delta = valid[actual] - valid[expected]
    relative = delta / valid[expected].where(valid[expected] != 0)
    return {
        "pairs": len(valid),
        "missing_pairs": len(frame) - len(valid),
        "signed_difference": stats(delta),
        "absolute_difference": stats(delta.abs()),
        "relative_difference_percent": stats(relative * 100),
        "absolute_relative_difference_percent": stats(relative.abs() * 100),
    }


def stats(series):
    series = series.dropna()
    if series.empty:
        return {}
    return {
        label: float(value)
        for label, value in zip(
            ["min", "p05", "median", "p95", "max"], series.quantile([0, 0.05, 0.5, 0.95, 1])
        )
    }


def reviewed_exceptions(con, pairs, cause_column, exceptions_path=CONFIG / "reconciliation_exceptions.csv"):
    """Recognize measured source defects without changing any published value."""
    columns = ["measure", "year", "location", "sex", "age_group"]
    leishmaniasis = {
        row[:5]: row[5]
        for row in con.execute(
            "SELECT measure,year,location,sex,age_group,value FROM observations WHERE cause_code=260"
        ).fetchall()
    }
    pinned = pd.read_csv(exceptions_path)
    known = {
        tuple(getattr(row, key) for key in columns) + (row.cause_code,): row for row in pinned.itertuples()
    }
    outside = pairs[(pairs.actual - pairs.expected).abs() > 0.01 + 1e-6 * pairs.expected.abs()]
    counts = {}
    unexplained = []
    for row in outside.to_dict("records"):
        key = tuple(row[key] for key in columns)
        cause = int(row[cause_column])
        reason = None
        if cause in [10, 20]:
            offset = leishmaniasis.get(key)
            if offset is not None:
                sign = 1 if cause == 20 else -1
                if abs(row["actual"] - row["expected"] - sign * offset) <= 0.01 + 1e-6 * row["expected"]:
                    reason = "code_20_excludes_leishmaniasis"
        snapshot = known.get(key + (cause,))
        if snapshot is not None:
            tolerance = 1e-7 + 1e-12 * abs(snapshot.published_value)
            if (
                abs(row["expected"] - snapshot.published_value) <= tolerance
                and abs(row["actual"] - snapshot.children_value) <= tolerance
            ):
                reason = "pinned_all_causes_defect" if cause == 0 else "pinned_stroke_precision_defect"
        if reason is None:
            unexplained.append(row)
        else:
            counts[reason] = counts.get(reason, 0) + 1
    return {
        "explained_counts": counts,
        "unexplained_count": len(unexplained),
        "unexplained_examples": unexplained[:5],
    }


def reconcile(con, mapping):
    con.register("cause_map", mapping)
    outputs = {}
    # Row counts are part of the audit; no reconciliation silently drops missing values.
    for label, sql in {
        "sexes": """SELECT measure,year,location,age_group,cause_code,
           max(value) FILTER (WHERE sex='both') AS expected,
           CASE WHEN count(value) FILTER (WHERE sex IN ('male','female'))=2
           THEN sum(value) FILTER (WHERE sex IN ('male','female')) END AS actual
           FROM observations GROUP BY ALL""",
        "ages": """SELECT measure,year,location,sex,cause_code,
           max(value) FILTER (WHERE age_group='all') AS expected,
           CASE WHEN count(value) FILTER (WHERE age_group!='all')=7
           THEN sum(value) FILTER (WHERE age_group!='all') END AS actual
           FROM observations GROUP BY ALL""",
        "partition": """SELECT measure,year,location,sex,age_group,
           max(value) FILTER (WHERE cause_code=0) AS expected,
           CASE WHEN count(value) FILTER (WHERE relation='primary')=
                     count(*) FILTER (WHERE relation='primary')
           THEN sum(value) FILTER (WHERE relation='primary') END AS actual
           FROM observations o JOIN cause_map m ON o.cause_code=m.code GROUP BY ALL""",
    }.items():
        pairs = con.execute(sql).df()
        outputs[label] = distribution(pairs)
        outputs[label]["outside_tolerance"] = int(
            ((pairs.actual - pairs.expected).abs() > 0.01 + 1e-6 * pairs.expected.abs()).sum()
        )
        if label == "partition":
            outputs[label]["source_exceptions"] = reviewed_exceptions(
                con, pairs.assign(cause_code=0), "cause_code"
            )
    pairs = con.execute("""
        WITH children AS (
          SELECT measure,year,location,sex,age_group,m.parent,
            CASE WHEN count(value)=count(*) THEN sum(value) END AS actual
          FROM observations o JOIN cause_map m ON o.cause_code=m.code
          WHERE m.parent IS NOT NULL GROUP BY ALL)
        SELECT c.*,o.value AS expected,m.level FROM children c
        JOIN observations o ON o.measure=c.measure AND o.year=c.year AND o.location=c.location
          AND o.sex=c.sex AND o.age_group=c.age_group AND o.cause_code=c.parent
        JOIN cause_map m ON m.code=c.parent
    """).df()
    outputs["hierarchy_by_parent_level"] = {}
    for level, group in pairs.groupby("level"):
        outputs["hierarchy_by_parent_level"][str(int(level))] = distribution(group) | {
            "outside_tolerance": int(
                ((group.actual - group.expected).abs() > 0.01 + 1e-6 * group.expected.abs()).sum()
            )
        }
    outputs["hierarchy_outside_tolerance"] = int(
        ((pairs.actual - pairs.expected).abs() > 0.01 + 1e-6 * pairs.expected.abs()).sum()
    )
    outputs["hierarchy_source_exceptions"] = reviewed_exceptions(con, pairs, "parent")
    for dimension, n, expected_id in [("sex", 2, "both"), ("age_group", 7, "all")]:
        grouping = [k for k in POP_KEYS if k != dimension]
        sql = f"""SELECT {",".join(grouping)},
            max(population) FILTER (WHERE {dimension}='{expected_id}') AS expected,
            CASE WHEN count(population) FILTER (WHERE {dimension}!='{expected_id}')={n}
            THEN sum(population) FILTER (WHERE {dimension}!='{expected_id}') END AS actual
            FROM population GROUP BY ALL"""
        outputs[f"population_{dimension}"] = distribution(con.execute(sql).df())
    return outputs


def reference_comparison(con, references):
    con.register("reference_rates", references)
    con.register("standard_weights", pd.DataFrame(load_weights().items(), columns=["age_group", "weight"]))
    pairs = con.execute("""
        WITH rates AS (
          SELECT o.*,o.value/nullif(p.population,0)*100000 AS rate
          FROM observations o JOIN population p USING(year,location,sex,age_group)
          WHERE o.cause_code=0 AND o.measure='deaths'),
        ours AS (
          SELECT year,location,sex,
            max(rate) FILTER(WHERE age_group='all') AS CDR,
            CASE WHEN count(rate) FILTER(WHERE age_group!='all')=7
            THEN sum(rate*w.weight) END AS ASDR
          FROM rates LEFT JOIN standard_weights w USING(age_group) GROUP BY ALL)
        SELECT r.measure,r.year,r.location,r.sex,r.value AS expected,
          CASE WHEN r.measure='CDR' THEN o.CDR ELSE o.ASDR END AS actual
        FROM reference_rates r LEFT JOIN ours o USING(year,location,sex)
        WHERE r.cause_code=0 AND r.year IN (SELECT DISTINCT year FROM observations)
    """).df()
    result = {}
    for measure, group in pairs.groupby("measure"):
        result[measure] = distribution(group)
        result[measure]["by_year"] = {
            str(int(year)): distribution(part) for year, part in group.groupby("year")
        }
        worst = group.assign(relative_error=(group.actual - group.expected) / group.expected)
        worst = worst.loc[worst.relative_error.abs().sort_values(ascending=False).head(5).index]
        result[measure]["largest_relative_errors"] = worst.to_dict("records")
    return result


def validate(con, mapping, references):
    con.register("cause_map", mapping)
    observation_schema, population_schema = schemas()
    # Validate one workbook-sized partition at a time to bound Pandera memory usage.
    row_count = 0
    for measure in MEASURES:
        for year in YEARS:
            frame = con.execute("SELECT * FROM observations WHERE measure=? AND year=?", [measure, year]).df()
            if frame.empty:
                raise ValueError(f"Missing {measure}/{year}")
            observation_schema.validate(frame, lazy=True)
            row_count += len(frame)
    population = con.execute("SELECT * FROM population").df()
    population_schema.validate(population, lazy=True)
    unknown = con.execute(
        "SELECT DISTINCT cause_code FROM observations EXCEPT SELECT code FROM cause_map"
    ).fetchall()
    if unknown:
        raise ValueError(f"Unmapped causes: {unknown}")
    incomplete = con.execute("""
        SELECT measure,year,location,sex,age_group FROM observations
        GROUP BY ALL HAVING count(*) != (SELECT count(*) FROM cause_map)
    """).fetchall()
    expected_rows = len(population) * len(mapping) * len(MEASURES)
    if incomplete or row_count != expected_rows:
        raise ValueError(
            "Incomplete observation grid: expected every cause for every population key and measure"
        )
    unmatched = con.execute("""
        SELECT count(*) FROM observations o ANTI JOIN population p USING(year,location,sex,age_group)
    """).fetchone()[0]
    if unmatched:
        raise ValueError("Observation has no matching population row")
    result = {
        "observations": row_count,
        "population": len(population),
        "missing_observations": con.execute(
            "SELECT count(*) FROM observations WHERE value IS NULL"
        ).fetchone()[0],
        "countries": population.location.nunique(),
        "causes": len(mapping),
        "schemas": "PASS: nonnegative finite values, valid dimensions, unique keys; all measure/year pairs present",
        "reconciliation": reconcile(con, mapping),
        "published_rates": reference_comparison(con, references),
    }
    unallocated = con.execute("""
        SELECT measure,year,
          sum(value) FILTER(WHERE m.organ='other_unallocated' AND m.relation='primary') /
          nullif(sum(value) FILTER(WHERE cause_code=0),0)*100 AS share_percent
        FROM observations o JOIN cause_map m ON o.cause_code=m.code
        WHERE sex='both' AND age_group='all' GROUP BY ALL ORDER BY measure,year
    """).df()
    result["unallocated_global_percent"] = unallocated.to_dict("records")
    diagnostics = result["reconciliation"]
    failures = [name for name in ["sexes", "ages"] if diagnostics[name]["outside_tolerance"]]
    if diagnostics["partition"]["source_exceptions"]["unexplained_count"]:
        failures.append("partition")
    if diagnostics["hierarchy_source_exceptions"]["unexplained_count"]:
        failures.append("hierarchy")
    result["reconciliation_failures"] = failures
    return result


def write_report(result, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    highlights = [
        (
            f"Validated **{result['observations']:,} observations**, **{result['population']:,} population rows**, "
            f"**{result['countries']} countries**, and **{result['causes']} causes** across both measures and all eight years."
        ),
        (
            f"Missing observations: **{result['missing_observations']:,}**. "
            f"Unexplained reconciliation failures: **{result['reconciliation_failures']}**."
        ),
        "",
        "| Check | Maximum absolute difference | Maximum absolute relative error (%) | Outside tolerance |",
        "|---|---:|---:|---:|",
    ]
    for name in ["sexes", "ages", "partition"]:
        check = result["reconciliation"][name]
        highlights.append(
            f"| {name} | {check['absolute_difference']['max']:.6g} | "
            f"{check['absolute_relative_difference_percent']['max']:.6g} | {check['outside_tolerance']} |"
        )
    for level, check in result["reconciliation"]["hierarchy_by_parent_level"].items():
        highlights.append(
            f"| Children → parent level {level} | {check['absolute_difference']['max']:.6g} | "
            f"{check['absolute_relative_difference_percent']['max']:.6g} | {check['outside_tolerance']} |"
        )
    if "published_cause_rates" in result:
        reference = result["published_cause_rates"]
        highlights.extend(
            [
                "",
                "## Published cause-level death rates",
                "",
                "Country deaths ASDRs now sum WHO-published primary-cause ASDRs, using WHO2026 at fine ages.",
                (
                    f"Parsed **{reference['rows']:,} rates**, **{reference['source_causes']} cause codes** per rate kind. "
                    f"Available years: **{reference['years']}**."
                ),
                "Four count-workbook descendants (261, 262, 831, 832) are absent; all primary causes are present.",
                "",
                "| Published primary sum vs All Causes | Pairs | Maximum absolute error per 100,000 | Maximum relative error (%) | Outside tolerance | Unexplained |",
                "|---|---:|---:|---:|---:|---:|",
            ]
        )
        for kind, check in reference["primary_partition"].items():
            highlights.append(
                f"| {kind} | {check['pairs']:,} | {check['absolute_difference']['max']:.6g} | "
                f"{check['absolute_relative_difference_percent']['max']:.6g} | {check['outside_tolerance']} | "
                f"{check['source_exceptions']['unexplained_count']} |"
            )
        crude = reference["cause_level_crude_comparison"]
        highlights.extend(
            [
                "",
                (
                    f"Count-derived cause-level crude rates: **{crude['pairs']:,} pairs**, "
                    f"maximum absolute difference **{crude['absolute_difference']['max']:.6g} per 100,000**, "
                    f"**{crude['outside_tolerance']}** outside tolerance."
                ),
                "There are 19 ASDR and 19 CDR primary-sum defects, all matching the previously pinned count-defect contexts.",
                "Exact published-rate snapshots are in config/reference_reconciliation_exceptions.csv; they are retained, not repaired.",
                "",
            ]
        )
    if "deaths_asdr_methods" in result:
        methods = result["deaths_asdr_methods"]
        highlights.extend(
            [
                "## Deaths ASDR method sensitivity",
                "",
                f"Tidy artifact: `{methods['path']}` — **{methods['rows']:,} rows**, **{methods['bytes']:,} bytes**.",
                "Differences are **broad-bin minus published sum**. Relative differences below are percentages of the published sum.",
                "Rows with a zero published sum have null relative differences and are excluded from relative quantiles.",
                "",
                "| Organ group | Relative pairs | P05 (%) | Median (%) | P95 (%) |",
                "|---|---:|---:|---:|---:|",
            ]
        )
        for row in methods["by_organ"]:
            quantiles = row["relative_difference_percent"]
            values = [
                f"{quantiles[key]:.3f}" if key in quantiles else "n/a" for key in ["p05", "median", "p95"]
            ]
            highlights.append(f"| {row['organ']} | {row['relative_pairs']:,} | {' | '.join(values)} |")
        highlights.append("")
    highlights.extend(
        [
            "",
            "## Broad-bin all-cause check (analysis artifact)",
            "",
            "Differences are **ours minus WHO**, per 100,000 population.",
            "ASDR here describes the retained broad-bin analysis method, not the exported country deaths ASDRs.",
            "",
            "| Rate | Pairs | Min difference | Median difference | P95 difference | Max difference | Median relative difference (%) |",
            "|---|---:|---:|---:|---:|---:|---:|",
        ]
    )
    for name, check in result["published_rates"].items():
        diff = check["signed_difference"]
        highlights.append(
            f"| {name} | {check['pairs']:,} | {diff['min']:.6g} | {diff['median']:.6g} | "
            f"{diff['p95']:.6g} | {diff['max']:.6g} | "
            f"{check['relative_difference_percent']['median']:.6g} |"
        )
    highlights.extend(
        [
            "",
            "## Global unallocated burden",
            "",
            "| Year | Measure | Other/unallocated share (%) |",
            "|---|---|---:|",
        ]
    )
    for check in result["unallocated_global_percent"]:
        if check["year"] in [2000, 2023]:
            highlights.append(f"| {check['year']} | {check['measure']} | {check['share_percent']:.6f} |")
    if "export" in result:
        size = result["export"]
        highlights.extend(
            [
                "",
                "## Export",
                "",
                (
                    f"**{size['files']} files**, **{size['bytes']:,} bytes** total "
                    f"({size['bytes'] / 1_000_000:.3f} MB). Largest: `{size['largest_file']}` "
                    f"(**{size['largest_bytes']:,} bytes**)."
                ),
                "",
            ]
        )
    if "sanity_checks" in result:
        highlights.extend(
            [
                "## World 2023: both sexes, all ages",
                "",
                "| Organ group | Deaths (unrounded count) |",
                "|---|---:|",
            ]
        )
        for check in result["sanity_checks"]["world_2023_top_10_groups_by_deaths"]:
            highlights.append(f"| {check['organ']} | {check['count']:,.3f} |")
        highlights.extend(
            [
                "",
                "Exported organ sums are checked against source All Causes for WLD, USA, IND, NGA and JPN,",
                "in 2000 and 2023, for both deaths and DALYs. The allowed error includes the sum of",
                "four-significant-digit rounding bounds plus source reconciliation tolerance.",
                "",
            ]
        )
    text = [
        "# WHO GHE 2023 pipeline validation",
        "",
        result["schemas"],
        "",
        *highlights,
        "",
        "## Known source inconsistencies (retained, not corrected)",
        "",
        "**WARN:** Code 20 excludes exactly code 260 (leishmaniasis), although its descendants and code 10 include it.",
        "This explains the paired level-1/2 errors: children minus parent equals -260 at code 10 and +260 at code 20.",
        "The semantic tree and disjoint primary mapping are retained; no published intermediate total is overwritten.",
        "There are also 76 All Causes cases (38 deaths, 38 DALYs) where the three published level-1 categories sum",
        "below the published root, and 17 small DALY stroke-subtype discrepancies. Exact keys and source values are",
        "pinned in config/reconciliation_exceptions.csv. The build accepts only those exact cases and the tested",
        "leishmaniasis identity; any unexplained discrepancy still fails the build. Raw errors remain in the tables.",
        "No fabricated residual cause is added. Consequently the primary set partitions the source cause tree,",
        "but it cannot reproduce an inconsistent source All Causes total exactly in those 76 cases.",
        "",
        "Canonical values are absolute counts (source thousands multiplied by 1,000).",
        "Reconciliation tolerance: absolute 0.01 persons/DALYs plus 1e-6 of the parent value.",
        "Relative errors exclude zero denominators; absolute differences retain them.",
        "Missing pairs are reported separately; no missing values are replaced with zero.",
        "",
        "## Measured diagnostics",
        "",
        "```json",
        json.dumps(result, indent=2, allow_nan=False),
        "```",
        "",
        "## Interpretation and limitations",
        "",
        "Crude death rates use the same all-age population denominator as WHO and should agree to floating-point precision.",
        "Country deaths ASDRs sum WHO's published cause ASDRs; linearity preserves the fine-age standardization.",
        "DALYs and WLD retain broad-bin standardization. Visceral collapses WHO2026 weights into seven age-specific bins",
        "(eight sheets including All ages). Within each bin it uses the country's observed age composition, rather than",
        "the standard population's fine-age composition. Differences can be large in countries with young populations,",
        "especially within the open 70+ bin; these are approximation errors, not corrected to match the reference.",
        "WLD is the sum of the included countries, not an official WHO regional/world estimate.",
        "",
        "Leishmaniasis subtypes 261/262 use printed e.1./e.2. labels to recover a fifth hierarchy level despite shared columns.",
        "Notes confirm that country colours describe cause-of-death evidence quality; the adjacent 1–4 row is retained",
        "as data_quality in the internal location table, without inventing a numeric grade-to-description crosswalk.",
        "Mapping is a single underlying-cause attribution, not an estimate of organ health or all multi-organ effects.",
        "Muscles has no separately identifiable muscular cause and is structurally empty. Other MSK maps to bones/joints.",
        "Mixed code 814 (endocrine/blood/immune) is retained in diabetes_endocrine because it cannot be split.",
        "Code 1160 (Other circulatory diseases) is other_unallocated: the label is not specifically cardiac.",
        "COVID-19 is assigned to lungs as a respiratory infection; systemic and multi-organ effects are acknowledged",
        "but remain under the single underlying cause. Intestinal nematodes map to small intestine and larynx",
        "cancer maps to lungs/airways. See cause_map.csv for individual rationales.",
        "",
    ]
    path.write_text("\n".join(text), encoding="utf-8")
