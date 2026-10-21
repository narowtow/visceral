"""Validate WHO cause rates, their primary partition, and count-derived crude rates."""

import pandera.pandas as pa

from .constants import CONFIG
from .validate import KEYS, distribution, reviewed_exceptions, schemas


def validate_reference_rates(con, mapping, references):
    con.register("reference_rates", references)
    con.register("cause_map", mapping)
    columns = schemas()[0].columns.copy()
    columns["measure"] = pa.Column(str, pa.Check.isin(["ASDR", "CDR"]))
    columns["year"] = pa.Column(int, pa.Check.ge(1900))
    columns["age_group"] = pa.Column(str, pa.Check.eq("all"))
    schema = pa.DataFrameSchema(columns, unique=KEYS, strict=True, coerce=True)
    for _, frame in references.groupby("measure"):
        schema.validate(frame.reset_index(drop=True), lazy=True)
    unknown = con.execute(
        "SELECT DISTINCT cause_code FROM reference_rates EXCEPT SELECT code FROM cause_map"
    ).fetchall()
    if unknown:
        raise ValueError(f"Unknown reference cause codes: {unknown}")
    missing = con.execute("""
        SELECT d.measure,p.year,p.location,p.sex,m.code FROM population p
        CROSS JOIN (VALUES ('ASDR'),('CDR')) d(measure) CROSS JOIN cause_map m
        ANTI JOIN reference_rates r ON r.measure=d.measure AND r.year=p.year AND r.location=p.location
            AND r.sex=p.sex AND r.cause_code=m.code
        WHERE p.age_group='all' AND (m.relation='primary' OR m.code=0)
    """).fetchall()
    if missing:
        raise ValueError(f"Missing published primary/all-cause rates: {missing[:5]}")
    crude = con.execute("""
        SELECT r.value AS expected, o.value/nullif(p.population,0)*100000 AS actual
        FROM reference_rates r LEFT JOIN observations o ON o.measure='deaths' AND o.age_group='all'
            AND o.year=r.year AND o.location=r.location AND o.sex=r.sex AND o.cause_code=r.cause_code
        LEFT JOIN population p ON p.year=r.year AND p.location=r.location AND p.sex=r.sex AND p.age_group='all'
        WHERE r.measure='CDR' AND r.year IN (SELECT DISTINCT year FROM observations)
    """).df()
    crude_result = distribution(crude)
    crude_result["outside_tolerance"] = int(
        ((crude.actual - crude.expected).abs() > 0.01 + 1e-6 * crude.expected.abs()).sum()
    )
    pairs = con.execute("""
        SELECT r.measure,r.year,r.location,r.sex,r.age_group,
            max(r.value) FILTER(WHERE cause_code=0) AS expected,
            CASE WHEN count(r.value) FILTER(WHERE relation='primary')=count(*) FILTER(WHERE relation='primary')
            THEN sum(r.value) FILTER(WHERE relation='primary') END AS actual
        FROM reference_rates r JOIN cause_map m ON r.cause_code=m.code
        WHERE r.year IN (SELECT DISTINCT year FROM observations) GROUP BY ALL
    """).df()
    partition = {}
    for measure, group in pairs.groupby("measure"):
        partition[measure] = distribution(group)
        partition[measure]["outside_tolerance"] = int(
            ((group.actual - group.expected).abs() > 0.01 + 1e-6 * group.expected.abs()).sum()
        )
        partition[measure]["source_exceptions"] = reviewed_exceptions(
            con, group.assign(cause_code=0), "cause_code", CONFIG / "reference_reconciliation_exceptions.csv"
        )
    absent = mapping.loc[~mapping.code.isin(references.cause_code), ["code", "name", "relation"]].to_dict(
        "records"
    )
    failures = []
    if crude_result["outside_tolerance"] or crude_result["missing_pairs"]:
        failures.append("cause_level_crude_rates")
    for measure, check in partition.items():
        if check["missing_pairs"] or check["source_exceptions"]["unexplained_count"]:
            failures.append(f"published_{measure}_partition")
    return {
        "rows": len(references),
        "years": {m: sorted(int(y) for y in g.year.unique()) for m, g in references.groupby("measure")},
        "source_causes": references.cause_code.nunique(),
        "absent_nonprimary_descendants": absent,
        "cause_level_crude_comparison": crude_result,
        "primary_partition": partition,
        "failures": failures,
    }
