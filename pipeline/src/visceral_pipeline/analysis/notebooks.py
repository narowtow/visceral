"""Generate narrative notebooks and execute their real code, with an explicit sandbox fallback."""

import json
import os
import subprocess
import sys
from pathlib import Path

import nbformat

from ..constants import PIPELINE
from .data import CACHE

SETUP = """from pathlib import Path
import json
import sys
root = next(p for p in [Path.cwd(), *Path.cwd().parents] if (p / "contracts/organs.json").exists())
sys.path.insert(0, str(root / "pipeline/src"))
import pandas as pd
from IPython.display import display, Markdown
from visceral_pipeline.analysis.data import CACHE, load_inputs, load_results
from visceral_pipeline.analysis import comparisons, sensitivity, clustering, plots
inputs, frames = load_inputs(), load_results()
meta = json.loads((CACHE / "metadata.json").read_text())
pd.set_option("display.max_rows", 65)
pd.set_option("display.max_columns", 12)
pd.set_option("display.width", 140)
"""


def notebook_specs():
    return [
        (
            "01_coverage_and_quality",
            [
                (
                    "markdown",
                    "# Coverage and quality\n\nWhat do these data support? WHO GHE 2023 describes modeled burden associated with causes mapped to groups, not organ health. All estimates below come from local validated inputs; no network requests occur.",
                ),
                ("code", SETUP),
                (
                    "markdown",
                    "## Scope and validation\n\nEight irregular dates, two measures and 185 countries. All-ages is an additional sheet, not an eighth age bin: standardization uses seven age bins. Primary nodes partition the cause tree structurally, but known inconsistent published totals prevent universal numerical identity. These are retained and pinned, never patched with invented residuals.",
                ),
                (
                    "code",
                    """display(inputs['coverage'])
display(inputs['locations'].groupby('data_quality').size().rename('countries').to_frame())
display(pd.DataFrame({'item':['observations','countries','organ groups'], 'value':[meta['observations'],meta['countries'],meta['organ_groups']]}))
report = (root / 'pipeline/reports/validation.md').read_text(encoding='utf-8')
display(Markdown(report))""",
                ),
                (
                    "markdown",
                    "## What is missing from the inference?\n\nWHO point estimates are modeled, and no uncertainty intervals are available in these inputs. Country percentiles are descriptive distributions, not confidence intervals. Data-quality grades summarize source vital-registration coverage; they are not uncertainty weights. WLD is the sum of the 185 available countries, not a separately downloaded WHO world estimate. Single-underlying-cause attribution cannot describe multimorbidity.",
                ),
            ],
        ),
        (
            "02_age_standardization",
            [
                (
                    "markdown",
                    "# Age structure changes country and organ comparisons\n\nCompare 2023, both sexes, crude rates with age-standardized rates (ASDRs), per 100,000. Country deaths use sums of WHO fine-age cause ASDRs; DALYs use the seven-bin approximation. Higher burden ranks first. Positive rank change means movement toward rank one; ties receive average ranks.",
                ),
                ("code", SETUP),
                (
                    "code",
                    """current = inputs['burden'].query("year==2023 and sex=='both' and location!='WLD'")
ranks = comparisons.rank_comparison(current,'rate','ageStdRate',['measure','organ'])
display(comparisons.rank_correlations(ranks,['measure','organ']))
plots.display_figure(plots.rankings(frames,meta))""",
                ),
                (
                    "markdown",
                    "## Concrete worked examples and largest movers\n\nJapan and Nigeria illustrate how different age structures change comparisons. The observed population share aged 70+ supplies context; it is not an estimated causal aging effect. The table reports both heart and brain. Below it, movers are selected separately for each measure and organ, so small-burden groups do not obscure the large groups.",
                ),
                (
                    "code",
                    """example = frames['country_ranks'].query("organ in ['heart','brain'] and location in ['JPN','NGA']")
display(example[['measure','location','organ','rate','ageStdRate','rank_a','rank_b','population_70_plus']].sort_values(['measure','organ','location']))
movers = frames['country_ranks'].assign(abs_change=lambda x:x.rank_change.abs()).sort_values('abs_change',ascending=False)
display(movers.groupby(['measure','organ'],sort=False).head(1)[['measure','organ','location','rank_a','rank_b','rank_change']].sort_values(['measure','organ']))""",
                ),
                (
                    "markdown",
                    "## The ranking of groups within a country also changes\n\nThe first table summarizes country-level profile agreement across the 30 nonempty groups; the second shows world and worked-example group ranks. Crude and standardized rankings answer different descriptive questions. Age adjustment does not make a ranking a health-system score. Rare groups with negligible deaths can have unstable rankings; muscles are structurally empty and have undefined rank correlation.",
                ),
                (
                    "code",
                    """display(frames['profile_correlations'].groupby('measure').rho.describe())
display(frames['profile_ranks'].query("location in ['WLD','JPN','NGA'] and organ in ['heart','brain','lungs','injuries','maternal_neonatal']")[['measure','location','organ','rate','ageStdRate','rank_a','rank_b']].sort_values(['measure','location','rank_b']))""",
                ),
            ],
        ),
        (
            "03_trends_and_sex",
            [
                (
                    "markdown",
                    "# Observed trends and sex contrasts\n\nDates are irregular: 2000, 2010, 2015, 2019–2023. We report endpoint changes and deviation from the observed 2019 value, not extrapolated counterfactuals or forecasts. WLD uses aggregate age-specific counts and populations and the broad-bin WHO2026 method for both measures.",
                ),
                ("code", SETUP),
                (
                    "code",
                    """changes = comparisons.period_changes(inputs['burden'])
display(changes.query("location=='WLD'").drop(columns=[2000,2010,2015,2019,2020,2021,2022,2023]))
plots.display_figure(plots.trends(frames,meta))
display(changes.query("location!='WLD'").groupby(['measure','organ'])[['change_2000_2019','change_2019_2020','change_2019_2021']].quantile([.05,.5,.95]))
display(changes.query("location in ['JPN','NGA','USA','UKR','AFG'] and organ in ['heart','brain','lungs']")[['measure','location','organ','change_2000_2019','change_2019_2020','change_2019_2021']].sort_values(['measure','organ','location']))""",
                ),
                (
                    "markdown",
                    "## COVID-19 accounting\n\nCOVID-19 is mapped to lungs for its respiratory presentation while systemic effects are acknowledged. Standardization is linear, so the total lung change separates into COVID and other mapped causes. COVID can exceed 100% of the **net** increase when other mapped lung causes decline. This is arithmetic attribution, not a claim that COVID caused all observed changes in other diseases.",
                ),
                ("code", """display(comparisons.pandemic_decomposition(inputs['burden'],inputs['covid']))"""),
                (
                    "markdown",
                    "## Sex contrasts\n\nMale/female ASDR ratios exclude prostate, testes, uterus/cervix, ovaries and breast (consistent exclusion despite male breast disease), plus the inseparable maternal/neonatal group. Zero female denominators are undefined, not zero ratios. Global estimates use broad bins while country death estimates use WHO fine-age rates; the distinction is labeled. Tiny death denominators, particularly sensory causes, can yield unstable ratios. These descriptive contrasts do not establish biological, exposure or care mechanisms.",
                ),
                (
                    "code",
                    """ratios, summary = comparisons.sex_ratios(inputs['burden'])
display(summary)
plots.display_figure(plots.sex(frames,meta))""",
                ),
            ],
        ),
        (
            "04_clustering",
            [
                (
                    "markdown",
                    "# Descriptive country profiles\n\nFeatures are 2023 both-sex death ASDRs for organ and systemic groups. Equally weighted countries are transformed with log(1 + rate per 100,000), then each feature is standardized. This retains overall intensity while reducing skew; composition shares remove total intensity and introduce closure. Constant muscles are removed. Missing values are rejected, not imputed. Standardization also gives rare groups influence and log1p depends on the stated rate unit.",
                ),
                ("code", SETUP),
                (
                    "code",
                    """rates = inputs['burden'].query("year==2023 and sex=='both' and measure=='deaths' and location!='WLD'").pivot(index='location',columns='organ',values='ageStdRate').sort_index().sort_index(axis=1)
features = clustering.feature_matrix(rates)
print(f'{features.shape[0]} countries; {features.shape[1]} nonconstant features; no imputation')
display(frames['cluster_diagnostics'])
print('Selection rule:',meta['clustering']['selection_rule'])
print('Selected k and stability criteria met:',clustering.choose_k(frames['cluster_diagnostics']))""",
                ),
                (
                    "markdown",
                    "## Separation, stability and projection\n\nThe analyze command fits k=2…8 with 50 starts and seed 2026. For each k, 100 bootstrap resamples of countries refit the scaler and k-means (20 starts), predict all original countries and compute adjusted Rand index against the original fit. This measures algorithmic stability conditional on WHO point estimates, not source-estimate uncertainty. The selected k must meet median ARI ≥0.80, p05 ≥0.50 and minimum size ≥5; then the best silhouette wins, with a 0.02 tolerance preferring smaller k. PCA is for display only; all features are used for clustering.",
                ),
                (
                    "code",
                    """plots.display_figure(plots.clustering(frames,meta))
display(pd.DataFrame(meta['clustering']['profiles']))
print('PCA explained variance:',meta['clustering']['pca_explained_variance'])
display(frames['cluster_centroids'].sort_values(['cluster','z'],ascending=[True,False]))""",
                ),
                (
                    "markdown",
                    "## Dependence on the analytical choice\n\nWard hierarchical clustering uses the same standardized log features and selected k. The alternative composition analysis uses shares, followed by feature standardization and k-means. Agreement is measured by ARI, which is invariant to cluster-label permutations. Modest agreement despite high within-method bootstrap stability argues against treating these patterns as natural country categories. Centroid descriptions are relative profiles, not judgments; members can differ substantially.",
                ),
                (
                    "code",
                    """print('Ward agreement ARI:',meta['clustering']['hierarchical_ari'])
print('Composition agreement ARI:',meta['clustering']['composition_ari'])
display(pd.DataFrame(meta['clustering']['composition_k_diagnostics']))
display(frames['cluster_membership'].sort_values(['cluster','location']))""",
                ),
            ],
        ),
        (
            "05_sensitivity",
            [
                (
                    "markdown",
                    "# Method, standard population and mapping sensitivity\n\nThese choices change the apparent distribution of burden while using the same underlying observations. Analyses below distinguish three sources of sensitivity rather than treating differences as sampling error.",
                ),
                ("code", SETUP),
                (
                    "markdown",
                    "## 1. Seven broad bins versus WHO fine-age ASDR\n\nFor country deaths, relative difference is 100 × (broad − published) / published. Zero published values are excluded from relative summaries and remain available as absolute pairs. The observed 70+ death share is an age-concentration proxy; no midpoint is invented for the open-ended bin. Pooling broad ages loses within-bin detail; associations with age concentration are descriptive and do not establish a causal explanation for every group.",
                ),
                (
                    "code",
                    """display(frames['methods_summary'].sort_values('median'))
print('Across-group rho (signed method difference vs global 70+ share):',meta['age_bias_group_rho'])
plots.display_figure(plots.methods(frames,meta))""",
                ),
                (
                    "markdown",
                    "## 2. Choice among five standard populations\n\nWHO2026, WHO2021, Segi, Scandinavian and European2013 are all collapsed to the same seven bins and normalized. Comparing all of them by the same broad-bin method isolates the choice of weights; using published fine-age WHO2026 only for the baseline would conflate two methods. Rank correlations below are across countries per group. The global table shows how the ranking of groups changes under each standard.",
                ),
                (
                    "code",
                    """standard_rates, standard_ranks, standard_rho, world = sensitivity.standard_sensitivity(inputs['ages'])
display(standard_rho.query("standard!='WHO2026'").sort_values(['measure','rho']))
display(world.pivot(index=['measure','organ'],columns='standard',values='rank'))
display(standard_ranks.assign(abs_change=lambda x:x.rank_change.abs()).sort_values('abs_change',ascending=False).groupby(['measure','standard'],sort=False).head(3)[['measure','standard','organ','location','rank_a','rank_b','rank_change']])""",
                ),
                (
                    "markdown",
                    "## 3. Alternative broad cause attribution\n\n`cause_map_alt.csv` preserves every primary node and its partition. COVID-19 and TB move to systemic infections, diabetes to pancreas, and the whole inseparable mental/substance aggregate to brain. Hypertensive heart disease stays heart. Other circulatory disease stays unallocated because its label is not exclusively cardiac. Descendant labels follow their primary ancestor; no death is counted twice. This is an illustrative attribution scenario, not an alternative medical ontology. Unallocated shares stay unchanged because all moves are between allocated groups. Shares use the sum of primary counts, avoiding inconsistent published root totals.",
                ),
                (
                    "code",
                    """alternative = sensitivity.mapping_comparison(inputs['burden'].query("year==2023 and sex=='both'"),inputs['alternative'])
display(alternative.query("location=='WLD'")[['measure','organ','rank_base','rank_alt','count_share_base','count_share_alt']])
display(alternative.query("location!='WLD'").groupby(['measure','organ'])['rank_change'].quantile([.05,.5,.95]).unstack())
plots.display_figure(plots.standards_mapping(frames,meta))""",
                ),
                (
                    "markdown",
                    "## Interpretation\n\nStandard population and mapping are explicit modeling choices; neither produces a uniquely correct body profile. Main production country death ASDRs retain WHO fine ages, while WLD and DALYs retain the documented approximation. These findings describe burden associated with mapped causes and should not be read as diagnosis, organ function, or estimates of a causal intervention.",
                ),
            ],
        ),
    ]


def create_notebooks(directory=PIPELINE / "notebooks"):
    paths = []
    Path(directory).mkdir(parents=True, exist_ok=True)
    for name, cells in notebook_specs():
        notebook = nbformat.v4.new_notebook(
            cells=[
                nbformat.v4.new_markdown_cell(text) if kind == "markdown" else nbformat.v4.new_code_cell(text)
                for kind, text in cells
            ]
        )
        notebook.metadata.update(
            {
                "kernelspec": {
                    "name": "visceral-pipeline",
                    "display_name": "Visceral pipeline",
                    "language": "python",
                },
                "language_info": {"name": "python", "version": sys.version.split()[0]},
            }
        )
        # Stable cell IDs make regenerated notebooks reviewable.
        for index, cell in enumerate(notebook.cells):
            cell.id = f"{name[:2]}-{index:02d}"
        path = Path(directory) / f"{name}.ipynb"
        nbformat.write(notebook, path)
        paths.append(path)
    return paths


def execute_in_process(path):
    """Capture actual cell execution when a sandbox cannot launch a local Jupyter kernel."""
    from IPython.core.interactiveshell import InteractiveShell
    from IPython.utils.capture import capture_output

    shell = InteractiveShell.instance()
    shell.reset(new_session=False)
    notebook = nbformat.read(path, as_version=4)
    count = 0
    for cell in notebook.cells:
        if cell.cell_type != "code":
            continue
        count += 1
        with capture_output(stdout=True, stderr=True, display=True) as captured:
            result = shell.run_cell(cell.source, store_history=False)
        if result.error_before_exec or result.error_in_exec:
            raise RuntimeError(f"Notebook {path.name} cell {count} failed") from (
                result.error_before_exec or result.error_in_exec
            )
        outputs = []
        for name, value in [("stdout", captured.stdout), ("stderr", captured.stderr)]:
            if value:
                outputs.append(nbformat.v4.new_output("stream", name=name, text=value))
        outputs.extend(
            nbformat.v4.new_output("display_data", data=o.data, metadata=o.metadata) for o in captured.outputs
        )
        cell.outputs = outputs
        cell.execution_count = count
    notebook.metadata["visceral_execution"] = (
        "Actual in-process IPython execution; local kernel launch unavailable"
    )
    nbformat.write(notebook, path)


def execute_notebooks(paths):
    runtime = CACHE / "jupyter"
    spec = runtime / "kernels/visceral-pipeline"
    spec.mkdir(parents=True, exist_ok=True)
    (spec / "kernel.json").write_text(
        json.dumps(
            {
                "argv": [sys.executable, "-m", "ipykernel_launcher", "-f", "{connection_file}"],
                "display_name": "Visceral pipeline",
                "language": "python",
            }
        ),
        encoding="utf-8",
    )
    env = os.environ.copy()
    env.update(
        {
            "JUPYTER_PATH": str(runtime),
            "JUPYTER_RUNTIME_DIR": str(runtime / "runtime"),
            "IPYTHONDIR": str(runtime / "ipython"),
        }
    )
    for folder in ["runtime", "ipython"]:
        (runtime / folder).mkdir(exist_ok=True)
    logs = []
    for path in paths:
        command = [
            sys.executable,
            "-m",
            "jupyter",
            "nbconvert",
            "--to",
            "notebook",
            "--execute",
            "--inplace",
            str(path),
            "--ExecutePreprocessor.timeout=120",
            "--ExecutePreprocessor.startup_timeout=20",
        ]
        try:
            result = subprocess.run(
                command, env=env, capture_output=True, text=True, timeout=150, check=False
            )
            logs.append(result.stdout + result.stderr)
            if result.returncode == 0:
                continue
            # Copied Windows venv launchers can retain an inaccessible old interpreter.
            # This invokes the same nbconvert execution engine with the current Python.
            direct = [sys.executable, "-m", "nbconvert", *command[4:]]
            result = subprocess.run(direct, env=env, capture_output=True, text=True, timeout=150, check=False)
            logs.append(result.stdout + result.stderr)
            if result.returncode == 0:
                continue
        except subprocess.TimeoutExpired as error:
            logs.append(str(error))
        # Failed cell execution is a code error, not permission for a fabricated output.
        # In-process execution also raises on any code error.
        os.environ["IPYTHONDIR"] = env["IPYTHONDIR"]
        execute_in_process(path)
        logs.append(f"{path.name}: executed using in-process IPython fallback\n")
    (CACHE / "notebook_execution.log").write_text("\n".join(logs), encoding="utf-8")
    fallback = [p.name for p in paths if "visceral_execution" in nbformat.read(p, as_version=4).metadata]
    return {"count": len(paths), "fallback": fallback}
