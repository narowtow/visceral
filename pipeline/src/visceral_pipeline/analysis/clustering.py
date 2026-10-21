"""Descriptive clustering with resampling of the entire scaling and fitting procedure."""

import numpy as np
import pandas as pd
from sklearn.cluster import AgglomerativeClustering, KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import adjusted_rand_score, silhouette_score
from sklearn.preprocessing import StandardScaler
from threadpoolctl import threadpool_limits

SEED = 2026


def feature_matrix(rates, mode="log"):
    if rates.isna().any().any() or not np.isfinite(rates.to_numpy()).all() or (rates < 0).any().any():
        raise ValueError("Features need complete, finite, nonnegative rates; no imputation is performed")
    if mode == "log":
        transformed = np.log1p(rates)
    elif mode == "composition":
        totals = rates.sum(axis=1)
        if (totals <= 0).any():
            raise ValueError("Composition has zero total")
        transformed = rates.div(totals, axis=0)
    else:
        raise ValueError("Unknown feature transform")
    return transformed.loc[:, transformed.nunique() > 1]


def bootstrap_stability(features, k, reference_labels, resamples=100, seed=SEED):
    """Refit scaling on each resampled set; predict all original countries and compare ARI."""
    values = np.asarray(features, dtype=float)
    if len(values) != len(reference_labels) or not 2 <= k < len(values) or resamples < 1:
        raise ValueError("Invalid bootstrap dimensions")
    rng = np.random.default_rng(seed)
    aris = []
    with threadpool_limits(limits=1):
        for iteration in range(resamples):
            sampled = values[rng.integers(0, len(values), len(values))]
            if len(np.unique(sampled, axis=0)) < k:
                continue
            scaler = StandardScaler().fit(sampled)
            model = KMeans(n_clusters=k, n_init=20, random_state=seed + iteration, max_iter=500).fit(
                scaler.transform(sampled)
            )
            aris.append(adjusted_rand_score(reference_labels, model.predict(scaler.transform(values))))
    if not aris:
        raise ValueError("No bootstrap resample can support k clusters")
    return np.asarray(aris)


def choose_k(diagnostics):
    stable = diagnostics[
        (diagnostics.ari_median >= 0.8) & (diagnostics.ari_p05 >= 0.5) & (diagnostics.min_size >= 5)
    ]
    pool = stable if len(stable) else diagnostics.sort_values("ari_median", ascending=False).head(1)
    best = pool.silhouette.max()
    chosen = pool[pool.silhouette >= best - 0.02].sort_values("k").iloc[0]
    return int(chosen.k), bool(len(stable))


def cluster_profiles(rates, resamples=100):
    features = feature_matrix(rates, "log")
    scaler = StandardScaler().fit(features)
    values = scaler.transform(features)
    rows = []
    models = {}
    with threadpool_limits(limits=1):
        for k in range(2, 9):
            model = KMeans(n_clusters=k, n_init=50, random_state=SEED, max_iter=1000).fit(values)
            models[k] = model
            stability = bootstrap_stability(features, k, model.labels_, resamples=resamples)
            rows.append(
                {
                    "k": k,
                    "silhouette": silhouette_score(values, model.labels_),
                    "ari_p05": np.quantile(stability, 0.05),
                    "ari_median": np.median(stability),
                    "ari_p95": np.quantile(stability, 0.95),
                    "ari_mean": stability.mean(),
                    "min_size": np.bincount(model.labels_).min(),
                    "resamples": len(stability),
                }
            )
        diagnostics = pd.DataFrame(rows)
        k, stable = choose_k(diagnostics)
        model = models[k]
        hierarchy = AgglomerativeClustering(n_clusters=k, linkage="ward").fit_predict(values)
        composition = feature_matrix(rates, "composition")
        composition_scaled = StandardScaler().fit_transform(composition)
        alt = KMeans(n_clusters=k, n_init=50, random_state=SEED).fit(composition_scaled)
        composition_diagnostics = []
        for alt_k in range(2, 9):
            labels = KMeans(n_clusters=alt_k, n_init=50, random_state=SEED).fit_predict(composition_scaled)
            composition_diagnostics.append(
                {"k": alt_k, "silhouette": silhouette_score(composition_scaled, labels)}
            )
        pca = PCA(n_components=2, svd_solver="full").fit(values)
        coordinates = pca.transform(values)
    membership = pd.DataFrame(
        {
            "location": rates.index,
            "cluster": model.labels_ + 1,
            "pc1": coordinates[:, 0],
            "pc2": coordinates[:, 1],
            "hierarchical_cluster": hierarchy + 1,
            "composition_cluster": alt.labels_ + 1,
        }
    )
    centroids = []
    raw_centers = np.expm1(scaler.inverse_transform(model.cluster_centers_))
    for cluster, center in enumerate(model.cluster_centers_):
        members = rates.iloc[np.where(model.labels_ == cluster)[0]]
        for index, organ in enumerate(features.columns):
            centroids.append(
                {
                    "cluster": cluster + 1,
                    "organ": organ,
                    "z": center[index],
                    "log_space_rate": raw_centers[cluster, index],
                    "median_rate": members[organ].median(),
                    "n": len(members),
                }
            )
    metadata = {
        "selected_k": k,
        "stable_criteria_met": stable,
        "bootstrap_resamples": resamples,
        "seed": SEED,
        "features": list(features.columns),
        "excluded_constants": sorted(set(rates.columns) - set(features.columns)),
        "selection_rule": "Median bootstrap ARI >= 0.80, p05 >= 0.50, minimum size >= 5; best silhouette, within 0.02 prefer smaller k. If none qualify, use most stable k illustratively.",
        "hierarchical_ari": adjusted_rand_score(model.labels_, hierarchy),
        "composition_ari": adjusted_rand_score(model.labels_, alt.labels_),
        "composition_silhouette": silhouette_score(composition_scaled, alt.labels_),
        "pca_explained_variance": pca.explained_variance_ratio_.tolist(),
        "composition_k_diagnostics": composition_diagnostics,
    }
    return membership, diagnostics, pd.DataFrame(centroids), metadata
