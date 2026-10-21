"""Persist and summarize broad-bin sensitivity relative to published country ASDR sums."""

from pathlib import Path

from .constants import INTERIM
from .storage import copy_parquet
from .validate import distribution, stats


def save_method_comparison(con, output_path=None):
    frame = con.execute("""SELECT * FROM deaths_asdr_method_comparison
                           ORDER BY location,year,sex,organ""").df()
    path = Path(output_path) if output_path is not None else INTERIM / "deaths_asdr_method_comparison.parquet"
    copy_parquet(con, frame, path)
    summaries = []
    for organ, group in frame.groupby("organ", sort=False):
        summaries.append(
            {
                "organ": organ,
                "rows": len(group),
                "relative_pairs": int(group.rel_diff.notna().sum()),
                "relative_difference_percent": stats(group.rel_diff * 100),
                "comparison": distribution(group, actual="broad_bin", expected="published_sum"),
            }
        )
    return {
        "path": (
            path.relative_to(INTERIM.parent.parent) if path.is_relative_to(INTERIM.parent.parent) else path
        ).as_posix(),
        "rows": len(frame),
        "bytes": path.stat().st_size,
        "difference_definition": "broad_bin - published_sum",
        "relative_difference_definition": "(broad_bin - published_sum) / published_sum; null when published_sum=0",
        "by_organ": summaries,
    }
