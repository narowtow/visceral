"""Regenerate Phase 4 outputs from the validated, fingerprinted interim cache."""

import json

import matplotlib.pyplot as plt

from ..constants import ROOT
from .compute import compute_results
from .data import CACHE, prepare_inputs
from .notebooks import create_notebooks, execute_notebooks
from .plots import PLOTS, save_figure
from .publish import publish_json, write_narrative


def run():
    print("Preparing analysis inputs from validated interim parquet", flush=True)
    inputs, organs = prepare_inputs()
    print("Computing comparisons and 100 bootstrap resamples for each k=2..8", flush=True)
    frames, meta = compute_results(inputs, organs)
    (CACHE / "metadata.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    figures = ROOT / "docs/figures"
    figures.mkdir(parents=True, exist_ok=True)
    for figure_id, plot in PLOTS.items():
        figure = plot(frames, meta)
        save_figure(figure, figures / f"{figure_id}.png")
        plt.close(figure)
    stats = publish_json(frames, meta)
    write_narrative(frames, meta)
    print("Executing five narrative notebooks", flush=True)
    stats["notebooks"] = execute_notebooks(create_notebooks())
    stats["figures"] = {p.name: p.stat().st_size for p in sorted(figures.glob("*.png")) if p.stem in PLOTS}
    stats["clustering"] = meta["clustering"]
    (CACHE / "run_summary.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print(json.dumps(stats, indent=2))
    return stats
