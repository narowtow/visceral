"""Versioned caches of WHO's published cause-specific death rates."""

import json

import pandas as pd

from .constants import INTERIM, RAW
from .ghe import parse_reference
from .storage import copy_parquet

REFERENCE_CACHE_VERSION = 2


def ensure_reference_cache(con, fingerprints, refresh=False):
    paths = {
        prefix: next(RAW.glob(pattern))
        for prefix, pattern in [
            ("CDR", "crude-death-rates*.xlsx"),
            ("ASDR", "age-standardized-death-rates*.xlsx"),
        ]
    }
    identity = {
        "formatVersion": REFERENCE_CACHE_VERSION,
        "source_hashes": {path.name: fingerprints[path.name] for path in paths.values()},
    }
    metadata_path = INTERIM / "reference_metadata.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8")) if metadata_path.exists() else {}
    if refresh or any(metadata.get(key) != value for key, value in identity.items()):
        frames = []
        years, rows = {}, {}
        for prefix, path in paths.items():
            print(f"Parsing cause-level reference rates: {path.name}", flush=True)
            frame = parse_reference(path, prefix)
            years[prefix] = sorted(int(year) for year in frame.year.unique())
            rows[prefix] = len(frame)
            frames.append(frame)
        copy_parquet(con, pd.concat(frames, ignore_index=True), INTERIM / "reference_rates.parquet")
        metadata = identity | {"years": years, "rows": rows}
        metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    con.from_parquet(str(INTERIM / "reference_rates.parquet")).create_view("reference_rates", replace=True)
    return metadata
