"""Acquire source inputs; parse/cache/validate/aggregate/export/analyze offline."""

import argparse
import hashlib
import json
import shutil
import tempfile
from pathlib import Path

import duckdb
import yaml

from .aggregate import aggregate
from .audit import export_stats, sanity_checks
from .constants import CONFIG, INTERIM, MEASURES, PIPELINE, RAW, ROOT, YEARS
from .export import export
from .ghe import parse_workbook
from .mapping import load_mapping
from .methods import save_method_comparison
from .reference_validation import validate_reference_rates
from .references import ensure_reference_cache
from .storage import copy_parquet
from .validate import validate, write_report


def hashes(record=True):
    source_path = CONFIG / "sources.yaml"
    sources = yaml.safe_load(source_path.read_text(encoding="utf-8"))
    found = {}
    for path in sorted(RAW.iterdir()):
        if path.suffix in {".xlsx", ".pdf"}:
            with path.open("rb") as stream:
                found[path.name] = hashlib.file_digest(stream, "sha256").hexdigest()
    if not found:
        raise ValueError(f"No source files at {RAW}")
    if record:
        # Preserve comments and all unrelated source metadata.
        text = source_path.read_text(encoding="utf-8")
        start = text.index("  sha256:")
        end = text.index("\n\nbodyparts3d_4_0:", start)
        text = (
            text[:start]
            + "  sha256:\n"
            + "".join(f'    "{k}": "{v}"\n' for k, v in found.items())
            + text[end:]
        )
        source_path.write_text(text, encoding="utf-8")
    else:
        old = sources["who_ghe_2023"]["sha256"]
        if old != found:
            raise ValueError(
                "Source hashes differ from sources.yaml; inspect raw inputs before recording changes"
            )
    return found


def parse(con):
    INTERIM.mkdir(parents=True, exist_ok=True)
    first_causes, first_locations = None, None
    for measure in MEASURES:
        for year in YEARS:
            prefix = "deaths" if measure == "deaths" else "daly"
            matches = list(RAW.glob(f"{prefix}_bycountry_age_sex_{year}_*.xlsx"))
            if len(matches) != 1:
                raise ValueError(f"Expected exactly one {measure}/{year} workbook; found {matches}")
            print(f"Parsing {matches[0].name}", flush=True)
            part = parse_workbook(matches[0], year, measure)
            if first_causes is None:
                first_causes, first_locations = part.causes, part.locations
            elif not first_causes.equals(part.causes) or not first_locations.equals(part.locations):
                raise ValueError("Source cause/location definitions changed between workbooks")
            copy_parquet(con, part.observations, INTERIM / f"observations_{measure}_{year}.parquet")
            copy_parquet(con, part.population, INTERIM / f"population_{measure}_{year}.parquet")
    copy_parquet(con, first_causes, INTERIM / "causes.parquet")
    copy_parquet(con, first_locations, INTERIM / "locations.parquet")
    (INTERIM / "source_hashes.json").write_text(
        json.dumps(hashes(record=False), sort_keys=True), encoding="utf-8"
    )


def load_cache(con):
    recorded = json.loads((INTERIM / "source_hashes.json").read_text(encoding="utf-8"))
    if recorded != hashes(record=False):
        raise ValueError("Stale parse cache: raw source fingerprints changed")
    for measure in MEASURES:
        for year in YEARS:
            for table in ["observations", "population"]:
                if not (INTERIM / f"{table}_{measure}_{year}.parquet").is_file():
                    raise ValueError(f"Missing cached {table}/{measure}/{year}")
    con.from_parquet(str(INTERIM / "observations_*.parquet")).create_view("observations")
    con.from_parquet(str(INTERIM / "population_*.parquet")).create_view("population_duplicates")
    conflicts = con.execute("""SELECT year,location,sex,age_group FROM population_duplicates GROUP BY ALL
        HAVING count(DISTINCT population)>1 OR (count(population)>0 AND count(population)<count(*))""").fetchall()
    if conflicts:
        raise ValueError("Deaths/DALY population denominators differ")
    con.execute("CREATE TABLE population AS SELECT DISTINCT * FROM population_duplicates")
    ensure_reference_cache(con, recorded)
    references = con.execute("SELECT * FROM reference_rates").df()
    locations = con.execute("SELECT * FROM read_parquet(?)", [str(INTERIM / "locations.parquet")]).df()
    return references, locations


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["acquire", "build", "report", "hashes", "analyze"])
    parser.add_argument("--skip-parse", action="store_true")
    parser.add_argument("--who", action="store_true", help="Acquire WHO inputs only (no source flags: both)")
    parser.add_argument("--bodyparts3d", action="store_true", help="Acquire BodyParts3D inputs only")
    parser.add_argument(
        "--force", action="store_true", help="Re-download even matching files; retain hash checks"
    )
    args = parser.parse_args(argv)
    if args.command != "acquire" and (args.who or args.bodyparts3d or args.force):
        parser.error("--who, --bodyparts3d and --force apply only to acquire")
    if args.command == "acquire":
        from .acquire import acquire

        if args.skip_parse:
            parser.error("--skip-parse does not apply to acquire")
        results = acquire(who=args.who, bodyparts3d=args.bodyparts3d, force=args.force)
        if any(result.status == "FAILED" for result in results):
            parser.exit(1, "Acquisition failed for one or more files; see summary above.\n")
        return
    if args.command == "analyze":
        from .analysis.run import run

        run()
        return
    if args.command == "hashes":
        print(json.dumps(hashes(), indent=2))
        return
    organs = [
        o["id"] for o in json.loads((ROOT / "contracts/organs.json").read_text(encoding="utf-8"))["organs"]
    ]
    mapping = load_mapping(organs)
    with duckdb.connect() as con:
        con.execute("SET threads=4")
        con.register("cause_map", mapping)
        if args.command == "build" and not args.skip_parse:
            hashes(record=False)
            parse(con)
        references, locations = load_cache(con)
        parsed_causes = con.execute("SELECT * FROM read_parquet(?)", [str(INTERIM / "causes.parquet")]).df()
        for col in ["code", "name", "level", "parent"]:
            left, right = mapping.set_index("code"), parsed_causes.set_index("code")
            if col == "code":
                if set(left.index) != set(right.index):
                    raise ValueError("Cause map does not cover source codes exactly")
            elif not left[col].sort_index().equals(right[col].sort_index()):
                raise ValueError(f"Cause map differs from workbook: {col}")
        result = validate(con, mapping, references)
        result["published_cause_rates"] = validate_reference_rates(con, mapping, references)
        result["reconciliation_failures"].extend(result["published_cause_rates"]["failures"])
        report_path = PIPELINE / "reports/validation.md"
        write_report(result, report_path)
        if result["reconciliation_failures"]:
            raise ValueError(f"Reconciliation failed; inspect {report_path}")
        aggregate(con, mapping, organs)
        result["deaths_asdr_methods"] = save_method_comparison(con)
        output = ROOT / "web/public/data"
        if args.command == "build":
            # Publish only after the complete export passes the contract and size gate.
            with tempfile.TemporaryDirectory(prefix="export-", dir=INTERIM) as stage:
                stage_path = Path(stage)
                result["export"] = export(con, mapping, locations, stage_path)
                result["sanity_checks"] = sanity_checks(con, stage_path)
                for source in stage_path.rglob("*.json"):
                    target = output / source.relative_to(stage_path)
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(source, target)
                for folder in ["locations", "summary"]:
                    for target in (output / folder).glob("*.json"):
                        if not (stage_path / folder / target.name).exists():
                            target.unlink()
        else:
            result["export"] = export_stats(output)
            result["sanity_checks"] = sanity_checks(con, output)
        result["interim_bytes"] = sum(p.stat().st_size for p in INTERIM.glob("*.parquet"))
        write_report(result, report_path)
        print(json.dumps(result, indent=2))
        print(f"Report: {report_path}")


if __name__ == "__main__":
    main()
