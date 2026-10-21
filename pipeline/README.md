# Visceral data pipeline

This package transforms the locally downloaded WHO Global Health Estimates 2023
workbooks into burden associated with causes mapped to organs. It never downloads
inputs and never estimates an individual's organ health.

## Run offline

Run from the repository root in PowerShell. The explicit import path selects this
checkout even when a copied virtual environment has an editable install pointing
to the original repository.

```powershell
$env:PYTHONPATH = "$PWD/pipeline/src"
pipeline/.venv/Scripts/python.exe -m visceral_pipeline hashes
pipeline/.venv/Scripts/python.exe -m visceral_pipeline build
pipeline/.venv/Scripts/python.exe -m visceral_pipeline build --skip-parse
pipeline/.venv/Scripts/python.exe -m visceral_pipeline report
pipeline/.venv/Scripts/python.exe -m pytest pipeline/tests -q
pipeline/.venv/Scripts/python.exe -m ruff check pipeline/src pipeline/tests
bash scripts/check.sh
```

Alternatively, use `uv run --offline --no-sync --project pipeline python -m
visceral_pipeline build` with the same `PYTHONPATH`. No dependency installation or
network access is needed. `hashes` deliberately records the current raw-file
hashes; ordinary builds **verify**, rather than replace, the pinned hashes. Review
input changes before running `hashes` again.

## Stages and tables

1. `ghe.py` opens each workbook with openpyxl in read-only mode, resets the bogus
   worksheet dimensions, detects the country header and ISO row by content,
   verifies the evidence category and three sex blocks, and melts country columns
   into tidy observations. Titles must identify thousands; numeric observations
   and populations are multiplied by 1,000. Published reference rates remain per
   100,000. Unexpected sheets, units, headers, numbers or sex blocks fail loudly.
2. `causes.py` recovers each hierarchy from the cause-name column and preceding
   indentation stack. WHO prints leishmaniasis subtypes (`e.1.`, `e.2.`) in their
   parent's columns, so those labels explicitly create a fifth level. Cause trees
   must agree across age sheets, sexes, measures and years.
3. The CLI writes `data/interim/observations_{measure}_{year}.parquet` and matching
   population partitions with DuckDB `COPY ... (FORMAT parquet, COMPRESSION zstd)`;
   pyarrow is neither used nor required. Cause, location/evidence metadata, and
   published cause-level ASDR/CDR reference rates are also cached. Raw fingerprints prevent
   `--skip-parse` from accepting a stale cache. Deaths and DALYs must have identical
   population denominators before their duplicated population records are removed.
   `references.py` versions the reference cache separately: old all-cause-only
   caches are automatically reparsed, including with `--skip-parse`.
4. `mapping.py` validates `config/cause_map.csv`, then Pandera schemas and DuckDB
   reconciliation queries in `validate.py` audit the canonical data. The report
   command regenerates `reports/validation.md` from the cache. It reports missing
   pairs, signed and absolute error distributions, and tolerance exceedances.
5. `aggregate.py` uses DuckDB SQL to sum only primary causes by organ, calculate
   crude and age-specific rates, select the appropriate ASDR method below, and select the five largest primary
   causes per organ, measure, year, country and sex. Ties use ascending cause code.
6. `export.py` writes the schemaVersion 1 contract in `web/public/data/`, with the
   authoritative organ order, four significant digits, compact JSON, both WHO
   citations and source-mtime retrieval dates. It checks the output using the same
   `contract.py` validator exercised against `contracts/fixtures/data/`. Summary
   matrices use all ages. Color domains cover positive estimates across all
   filters for anatomical (`kind=organ`) groups only. It reports aggregate bytes
   and the largest file, and refuses payloads above 60,000,000 bytes.

Canonical tables:

- `observations(measure, year, location, sex, age_group, cause_code, value)`
- `population(year, location, sex, age_group, population)`

The canonical dimensions use contract ids. Source cause codes remain integers;
missing estimates remain null. Empty organ groups are known empty sums (zero),
whereas missing component estimates propagate to null. Internal location metadata
retains the WHO 1–4 evidence category as `data_quality`. Notes discuss evidence
quality through colours; no unsupported grade-description crosswalk is invented.

## Design decisions

WHO assigns a single underlying cause. The organ mapping is an attribution of that
cause's burden, not an estimate of every organ affected by it. The primary set is a
cut through the cause tree: every leaf-to-root path intersects exactly one primary
node. No primary has another primary ancestor. Tests prove this property on the
real CSV without needing raw workbooks. Ancestors and descendants represented by
a primary node have `relation=none`; every GHE code remains in the mapping.

Broad groups can be primary when all their descendants share an attribution:
mental/substance use disorders, neurological conditions, injuries, congenital
anomalies, neonatal conditions, chronic respiratory diseases, and MSK conditions.
Other causes are assigned at finer levels. Review the rationales for COVID-19 to
lungs, tuberculosis to lungs, larynx cancer to lungs/airways, intestinal nematodes
to small intestine, other circulatory conditions to other/unallocated, and the inseparable
endocrine/blood/immune residual (814) to diabetes/endocrine. Non-anatomical residuals
remain `other_unallocated`. Muscles has no clearly muscular cause and is empty.
No residual estimates are manufactured by subtracting parents and children.

### ASDR methods

**Country deaths:** sum WHO's published cause-specific ASDRs over each organ's
primary causes. Direct standardization is linear, so this preserves WHO2026
standardization at fine ages (including the separate 0–1 and 1–4 ages in WHO's
Notes). Published rates are already per 100,000: no population division, country
averaging, or broad-bin correction is applied to these country ASDRs.

**DALYs and WLD (both measures):** use Visceral's seven-bin approximation. There
are no published DALY ASDRs or published WLD ASDRs in the supplied files. WLD
uses summed age-specific counts and populations before standardization; country
ASDRs cannot be combined by averaging.

`standardize.py` is a pure direct-standardization implementation accepting any
normalized standard. All five standards in `standard_populations.csv` can be
collapsed and selected. The production default is **WHO2026**, collapsed from
five-year percentages to the seven age-specific GHE bins and normalized to one
(the transcribed percentages total 100.02). “Eight bins” includes the All ages
sheet: it is not an additional standardization weight. A missing age-specific
rate yields a missing ASDR rather than renormalization around the missing band.

Broad-bin standardization is an approximation: a country's within-bin population
composition differs from the standard population's, especially inside 70+.
Published WHO ASDR therefore need not match the retained broad-bin calculation.
The exported country deaths ASDRs use the published method; the approximation
is retained for methods sensitivity, not silently substituted for a missing
published primary-cause rate. Missing published components produce null, and
the production reference-coverage validation rejects missing primary rates.

`methods.py` writes `data/interim/deaths_asdr_method_comparison.parquet`, keyed by
`location,year,sex,organ`, with `published_sum,broad_bin,diff,rel_diff`. All rates
and absolute differences are per 100,000. `diff = broad_bin - published_sum`;
`rel_diff = diff / published_sum` is a fraction, null when the denominator is
zero. It includes empty groups as structural zeros, excludes WLD (no published
comparator), and preserves full precision. The report presents p05/median/p95
relative differences as percentages by organ for Phase 4 analysis.

`reference_validation.py` validates the cause-rate grid and primary coverage,
compares all count-derived cause-level crude rates with WHO's published CDRs,
and reconciles published primary sums against published All Causes for ASDR/CDR.
The supplied reference workbooks each contain 214 codes and exactly the existing
eight years: 2000, 2010, 2015, 2019–2023. There are no additional annual sheets.
Codes 261, 262, 831 and 832 are absent, but all 95 mapped primary causes are
present. Those omitted detail descendants are covered by primary ancestors;
no missing reference values are filled or invented.

`WLD` sums the available countries' counts and populations first, then divides;
it never averages rates and does not claim to reproduce a separate official WHO
world aggregate. Missing components propagate into world totals.

## Data provenance & terms

Pinned filenames, SHA-256 hashes, both mortality and disease-burden citations,
and the WHO terms URL are in `config/sources.yaml`. Local `SHA256SUMS.txt` is an
additional download audit, not an external cryptographic authenticity guarantee.
Workbooks are the GHE 2023 release published in 2026, not earlier GHE releases.
The standard-population Table 1 transcription is supplied in the repository;
the pipeline does not read the accompanying PDF. Population denominators are the
WHO workbooks' UN World Population Prospects 2024 estimates. Retrieval dates are
inferred from workbook mtimes in UTC, which can change if files are copied.

Sources: World Health Organization, *Global Health Estimates 2023: Deaths by Cause,
Age, Sex, by Country and by Region, 2000–2023*; and *Disease burden by Cause, Age,
Sex, by Country and by Region, 2000–2023*. Geneva: WHO; 2026.

- https://www.who.int/data/global-health-estimates
- https://www.who.int/about/policies/publishing/data-policy/terms-and-conditions

## Measured source inconsistencies

The full build found a source bookkeeping pattern: published code 20 excludes
exactly code 260 (leishmaniasis), although code 20's descendants and code 10 include
it. The parser retains the anatomical hierarchy and every published value.
Leishmaniasis subtypes 261/262 have level 5, parent 260, based on their printed
`e.1.`/`e.2.` labels; the primary ancestor 210 is summed only once.

There are also 76 inconsistent All Causes totals (38 deaths, 38 DALYs) and 17 small
DALY stroke-child discrepancies. Exact coordinates and values are pinned in
`config/reconciliation_exceptions.csv`. Validation recognizes only those snapshots
and the independently tested leishmaniasis identity; unexplained errors still
stop publication. Raw error distributions and accepted exception counts are
reported. No residual estimates are invented. Structural coverage of every leaf
therefore does not imply numerical equality to inconsistent published root totals.

Code 1160, `Other circulatory diseases`, is deliberately other/unallocated because
its label includes more than cardiac disease. COVID-19 maps to lungs as a
respiratory infection while acknowledging systemic effects. The inseparable code
814 endocrine/blood/immune residual remains diabetes/endocrine.

Published ASDR and CDR primary sums each have 19 All Causes discrepancies in the
same country/year/sex contexts already pinned for deaths counts. Their exact
rate values are pinned separately in `config/reference_reconciliation_exceptions.csv`.
They remain visible as warnings; unknown or changed defects fail validation.

## Tests

Tests use pytest's default `tmp_path` under the operating system's temporary
directory. No repository `basetemp`, retention override, or cache path into
`pipeline/data/` is configured, and tests do not write into `pipeline/data/`.

## Reproducible descriptive analysis (Phase 4)

From `pipeline/`, after a successful build, run:

```powershell
$env:PYTHONPATH="$PWD/src"
.venv/Scripts/python.exe -m visceral_pipeline analyze
```

This verifies the interim cache's source fingerprints, aggregates the baseline
and alternative mappings in DuckDB, and writes reusable tidy analysis parquet
tables under `data/interim/analysis/`. It generates the [analysis write-up](../docs/analysis.md),
five executed [notebooks](notebooks/), six 1600-pixel figures in `docs/figures/`,
and compact chart datasets in `web/public/data/analysis/`. Existing production
burden JSON is retained. No download or new dependency is needed.

The helpers in `src/visceral_pipeline/analysis/` separate input aggregation,
rank/period/sex comparisons, sensitivity, clustering, figures and publication.
Notebooks call these helpers and read the regenerated tables. Each is executed
with `python -m jupyter nbconvert --to notebook --execute --inplace`. Copied
Windows environments may contain stale launcher paths; the command then tries
`python -m nbconvert` with the same execution engine. Only if local kernel launch
is unavailable does it execute cells in-process with IPython and save captured
outputs using nbformat. `data/interim/analysis/notebook_execution.log` and
`run_summary.json` record the path used; cell errors still fail the run.

Country death ASDRs use WHO fine-age cause sums; DALYs and WLD use seven broad
bins. Standard-population sensitivity reweights the same broad-bin rates under
all five standards to isolate weight choice. WLD is the sum of available
countries, with rates computed after count and population aggregation. COVID
decomposition is additive accounting against observed 2019, not a causal
counterfactual. The alternative CSV preserves the primary partition: TB/COVID
move to systemic infections, diabetes to pancreas, and the whole inseparable
mental/substance aggregate to brain; other circulatory stays unallocated.
Unallocated shares use summed primary counts because published roots contain
the documented source inconsistencies.

Clustering gives countries equal weight and uses standardized log(1 + death
ASDR per 100,000); the constant empty muscles feature is removed, without
imputation. It compares k=2…8, with seed 2026, 50 k-means starts and 100 country
bootstrap resamples per k, refitting the scaler and clustering each time.
Selection requires median ARI ≥0.80, p05 ≥0.50 and minimum size ≥5, then the
best silhouette (within 0.02 prefer smaller k). A fallback to the most stable
candidate is explicitly recorded if none qualify. Ward and composition-share
comparisons assess dependence on method. Stability is conditional on WHO point
estimates, not their uncertainty. Distribution percentiles are descriptive,
and all conclusions avoid causal or health-system-performance interpretations.
