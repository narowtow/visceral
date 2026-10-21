"""Publication figures. All plotted quantities are descriptive point estimates."""

from io import BytesIO

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from IPython.display import Image, display

SOURCE = "WHO GHE 2023; Visceral analysis"
plt.rcParams.update(
    {
        "font.size": 12,
        "axes.titlesize": 14,
        "axes.labelsize": 12,
        "figure.titlesize": 19,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "font.family": "DejaVu Sans",
    }
)


def finish(fig, title, note=""):
    fig.suptitle(title, x=0.04, ha="left", fontweight="bold")
    fig.tight_layout(rect=(0.015, 0.08, 0.985, 0.92), w_pad=3)
    fig.text(0.04, 0.025, f"{SOURCE}. {note}", fontsize=10, color="#444444")
    return fig


def save_figure(fig, path):
    fig.savefig(path, dpi=100, pil_kwargs={"optimize": True, "compress_level": 9})
    if path.stat().st_size >= 300000:
        raise ValueError(f"Figure exceeds 300 KB: {path}")


def display_figure(fig):
    stream = BytesIO()
    fig.savefig(stream, format="png", dpi=100, pil_kwargs={"compress_level": 9})
    display(Image(data=stream.getvalue()))
    plt.close(fig)


def rankings(frames, meta=None):
    ranks = frames["country_ranks"].query("measure=='deaths'")
    fig, axes = plt.subplots(1, 2, figsize=(16, 7.5))
    for ax, organ in zip(axes, ["heart", "brain"]):
        group = ranks[ranks.organ == organ]
        points = ax.scatter(
            group.rate,
            group.ageStdRate,
            c=group.population_70_plus,
            cmap="viridis",
            s=35,
            alpha=0.85,
            vmin=0,
            vmax=25,
        )
        bounds = [
            min(group.rate.min(), group.ageStdRate.min()) * 0.8,
            max(group.rate.max(), group.ageStdRate.max()) * 1.2,
        ]
        ax.plot(bounds, bounds, ls="--", color="gray", lw=1, label="Equal rate")
        for row in group[group.location.isin(["JPN", "NGA", "USA", "UKR", "AFG"])].itertuples():
            ax.annotate(
                row.location,
                (row.rate, row.ageStdRate),
                xytext=(5, 5),
                textcoords="offset points",
                fontsize=11,
            )
        ax.set(
            xscale="log",
            yscale="log",
            xlim=bounds,
            ylim=bounds,
            xlabel="Crude death rate per 100,000",
            ylabel="WHO age-standardized death rate per 100,000",
            title=organ.title(),
        )
        ax.grid(alpha=0.15, which="both")
        fig.colorbar(points, ax=ax, label="Population aged 70+ (%)", shrink=0.75)
    return finish(
        fig,
        "Age structure changes country comparisons",
        "2023, both sexes; 185 countries. Log axes; WHO fine-age ASDRs.",
    )


def trends(frames, meta=None):
    data = frames["world_trends"]
    fig, axes = plt.subplots(1, 2, figsize=(16, 7.5))
    colors = plt.colormaps["viridis"]([0.15, 0.5, 0.82])
    for ax, measure, label in zip(axes, ["deaths", "dalys"], ["Deaths", "DALYs"]):
        for organ, color, marker in zip(["heart", "brain", "lungs"], colors, ["o", "s", "^"]):
            part = data[(data.measure == measure) & (data.organ == organ)].sort_values("year")
            ax.plot(part.year, part.ageStdRate, color=color, marker=marker, lw=2.2, label=organ.title())
        ax.axvspan(2019.5, 2021.5, color="gray", alpha=0.12)
        ax.set(
            title=label,
            xlabel="Year (eight observed time points)",
            ylabel=f"Age-standardized {label.lower()} per 100,000",
            xticks=[2000, 2010, 2015, 2020, 2023],
        )
        ax.grid(alpha=0.18)
        ax.legend(frameon=False)
    return finish(
        fig,
        "Observed global trends: before, during and after 2020–2021",
        "WLD, both sexes; WHO2026 broad-bin method. Lines connect observations; no forecasting.",
    )


def clustering(frames, meta):
    membership = frames["cluster_membership"]
    centroids = frames["cluster_centroids"]
    k = meta["clustering"]["selected_k"]
    variance = meta["clustering"]["pca_explained_variance"]
    fig, axes = plt.subplots(1, 2, figsize=(16, 8), gridspec_kw={"width_ratios": [1, 1.2]})
    colors = plt.colormaps["viridis"](np.linspace(0.12, 0.88, k))
    for cluster in range(1, k + 1):
        part = membership[membership.cluster == cluster]
        axes[0].scatter(
            part.pc1,
            part.pc2,
            s=40,
            color=colors[cluster - 1],
            label=f"Pattern {cluster} (n={len(part)})",
            alpha=0.85,
        )
    for row in membership[membership.location.isin(["JPN", "NGA", "USA", "UKR", "AFG"])].itertuples():
        axes[0].annotate(
            row.location, (row.pc1, row.pc2), xytext=(4, 4), textcoords="offset points", fontsize=10
        )
    axes[0].set(
        xlabel=f"PC1 ({variance[0] * 100:.1f}% of feature variance)",
        ylabel=f"PC2 ({variance[1] * 100:.1f}%)",
        title="PCA projection; clustering uses every feature",
    )
    axes[0].legend(frameon=False, fontsize=10)
    matrix = centroids.pivot(index="cluster", columns="organ", values="z")
    features = matrix.std().nlargest(12).index
    matrix = matrix.loc[:, features]
    image = axes[1].imshow(matrix, aspect="auto", cmap="cividis")
    axes[1].set(
        xticks=range(len(features)),
        xticklabels=[o.replace("_", " ") for o in features],
        yticks=range(k),
        yticklabels=[f"Pattern {i}" for i in range(1, k + 1)],
        title="Most differentiated centroid features",
    )
    axes[1].tick_params(axis="x", rotation=55, labelsize=10)
    fig.colorbar(image, ax=axes[1], label="Mean standardized log(1 + ASDR)", shrink=0.7)
    return finish(
        fig,
        "Country profiles are descriptive patterns, not a league table",
        "2023 deaths, both sexes; countries have equal weight. Constant features removed.",
    )


def methods(frames, meta):
    data = frames["methods_summary"].dropna(subset=["median"])
    selected = data.nsmallest(12, "median").sort_values("median", ascending=False)
    fig, axes = plt.subplots(1, 2, figsize=(16, 8))
    norm = plt.Normalize(0, 100)
    colors = plt.colormaps["viridis"](norm(selected.world_70_plus_share))
    axes[0].barh(selected.organ.str.replace("_", " "), selected["median"], color=colors)
    axes[0].errorbar(
        selected["median"],
        np.arange(len(selected)),
        xerr=np.array([selected["median"] - selected.p05, selected.p95 - selected["median"]]),
        fmt="none",
        ecolor="#444444",
        capsize=2,
    )
    axes[0].axvline(0, color="gray", lw=1)
    axes[0].set(
        xlabel="Broad-bin minus published ASDR (%)", title="Largest median underestimates; country p05–p95"
    )
    dots = axes[1].scatter(
        data.world_70_plus_share, data["median"], c=data.world_70_plus_share, cmap="viridis", norm=norm, s=65
    )
    for row in data[
        data.organ.isin(["heart", "brain", "lungs", "congenital", "maternal_neonatal"])
    ].itertuples():
        offset = {"congenital": (12, 15), "maternal_neonatal": (12, -14)}.get(row.organ, (4, 4))
        axes[1].annotate(
            row.organ.replace("_", " "),
            (row.world_70_plus_share, row.median),
            xytext=offset,
            textcoords="offset points",
            fontsize=10,
        )
    axes[1].set(
        xlabel="Observed global deaths at age 70+ (%)",
        ylabel="Median country method difference (%)",
        title=f"Across-group Spearman ρ = {meta['age_bias_group_rho']:.2f}",
    )
    axes[1].axhline(0, color="gray", lw=1)
    fig.colorbar(dots, ax=axes[1], label="Global 70+ death share (%)", shrink=0.7)
    return finish(
        fig,
        "Age-concentrated causes are sensitive to broad age bins",
        "2023, both sexes; association is descriptive. Relative differences exclude zero published rates.",
    )


def standards_mapping(frames, meta=None):
    fig, axes = plt.subplots(1, 2, figsize=(16, 8))
    selected = frames["standard_correlations"].query("measure=='deaths' and standard!='WHO2026'")
    features = ["heart", "brain", "lungs", "kidneys", "injuries", "maternal_neonatal"]
    matrix = selected.pivot(index="standard", columns="organ", values="rho").loc[
        ["WHO2021", "Segi", "Scandinavian", "European2013"], features
    ]
    image = axes[0].imshow(matrix, aspect="auto", cmap="viridis", vmin=0.95, vmax=1)
    axes[0].set(
        xticks=range(len(features)),
        xticklabels=[s.replace("_", " ") for s in features],
        yticks=range(len(matrix)),
        yticklabels=matrix.index,
        title="Country rank ρ vs WHO2026 (all broad-bin)",
    )
    axes[0].tick_params(axis="x", rotation=45, labelsize=10)
    for y in range(len(matrix)):
        for x in range(len(features)):
            value = matrix.iloc[y, x]
            axes[0].text(
                x, y, f"{value:.3f}", ha="center", va="center", color="black" if value > 0.98 else "white"
            )
    fig.colorbar(image, ax=axes[0], label="Spearman rank correlation", shrink=0.7)
    mapping = frames["mapping"].query("measure=='deaths' and location=='WLD'").set_index("organ")
    chosen = [
        "heart",
        "brain",
        "lungs",
        "infections_systemic",
        "pancreas",
        "mental_substance",
        "other_unallocated",
    ]
    part = mapping.loc[chosen].sort_values("count_share_base")
    y = np.arange(len(part))
    axes[1].barh(
        y - 0.18,
        part.count_share_base,
        height=0.34,
        color=plt.colormaps["cividis"](0.2),
        label="Baseline mapping",
    )
    axes[1].barh(
        y + 0.18,
        part.count_share_alt,
        height=0.34,
        color=plt.colormaps["cividis"](0.8),
        label="Alternative mapping",
    )
    axes[1].set(
        yticks=y,
        yticklabels=[s.replace("_", " ") for s in part.index],
        xlabel="Share of summed primary deaths (%)",
        title="Changing attribution changes the body profile",
    )
    axes[1].legend(frameon=False, fontsize=11)
    return finish(
        fig,
        "Standards and cause attribution are consequential choices",
        "2023, both sexes. Mapping scenario changes attribution, not the underlying deaths.",
    )


def sex(frames, meta=None):
    groups = [
        "heart",
        "brain",
        "lungs",
        "liver",
        "kidneys",
        "injuries",
        "blood_immune",
        "diabetes_endocrine",
        "mental_substance",
        "bones_joints",
        "skin",
        "infections_systemic",
    ]
    data = (
        frames["sex_summary"]
        .query("measure=='deaths'")
        .set_index("organ")
        .loc[groups]
        .sort_values("world_ratio")
    )
    fig, ax = plt.subplots(figsize=(16, 8))
    y = np.arange(len(data))
    ax.hlines(y, data.p05, data.p95, color="#777777", lw=2, label="Country p05–p95 (descriptive range)")
    ax.scatter(
        data["median"],
        y,
        color=plt.colormaps["viridis"](0.35),
        s=65,
        label="Country median (WHO fine-age rates)",
        zorder=3,
    )
    ax.scatter(
        data.world_ratio,
        y,
        marker="D",
        s=60,
        color=plt.colormaps["cividis"](0.82),
        edgecolor="black",
        lw=0.4,
        label="WLD ratio (broad-bin rates)",
        zorder=4,
    )
    ax.axvline(1, color="black", ls="--", lw=1)
    ax.set(
        yticks=y,
        yticklabels=[o.replace("_", " ") for o in data.index],
        xscale="log",
        xlabel="Male / female age-standardized death-rate ratio (log scale)",
    )
    ax.grid(axis="x", alpha=0.18, which="both")
    ax.legend(frameon=False, fontsize=11, loc="lower right")
    return finish(
        fig,
        "Sex differences vary by cause group and country",
        "2023; 12 selected groups. Reproductive groups and mixed maternal/neonatal group excluded.",
    )


PLOTS = {
    "age-rankings": rankings,
    "global-trends": trends,
    "country-patterns": clustering,
    "age-methods": methods,
    "standards-mapping": standards_mapping,
    "sex-ratios": sex,
}
