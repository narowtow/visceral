import { useMemo, useState } from 'react'
import type { Manifest } from '../data/contract'
import { REPO_URL } from '../content/sources'
import FigureCard from '../analysis/FigureCard'
import { parseFindings, parseIndex } from '../analysis/data'
import type { AnalysisIndex, Finding } from '../analysis/data'
import { useAnalysis } from '../analysis/useAnalysis'
import { number, primaryFigures } from '../analysis/presentation'

function FindingSection({ finding, index, countries, ordinal }: { finding: Finding; index: AnalysisIndex; countries: ReadonlyMap<string, string>; ordinal: number }) {
  const [more, setMore] = useState(false)
  const entries = index.figures.filter(entry => finding.figureIds.includes(entry.id))
  const missing = finding.figureIds.filter(id => !entries.some(entry => entry.id === id))
  const main = primaryFigures[finding.id]
  const extra = entries.filter(entry => !main.includes(entry.id))
  return <section className="analysis-finding" aria-labelledby={`finding-${finding.id}`}>
    <header><span className="eyebrow">Finding {String(ordinal).padStart(2, '0')}</span><h2 id={`finding-${finding.id}`}>{finding.headline}</h2>
      <p className="analysis-explanation">{finding.detail}</p>
      {finding.id === 'age-structure' && <p>A population’s age mix and its observed age-specific burden both matter. These rank shifts do not establish a causal effect of aging.</p>}
      {finding.id === 'pandemic' && <p>The World series uses broad age bins with observed 2019 as a reference, not a modeled pandemic-free alternative.</p>}
      {finding.id === 'method' && <p>Changing the standard population is a separate analytical choice: all five standards below use the same broad-bin method to isolate the effect of their weights.</p>}
      {finding.id === 'patterns' && <p className="analysis-caveat">Agreement is modest with both Ward clustering (ARI {number(finding.numbers.wardARI)}) and composition-based features (ARI {number(finding.numbers.compositionARI)}). Membership depends on the analytical choices; these patterns are not intrinsic country types or health-system grades.</p>}
      {finding.id === 'sex' && <p>Country percentiles describe variation between countries; they do not express uncertainty in WHO’s estimates.</p>}
    </header>
    {missing.length > 0 && <p role="alert">The analysis index is missing referenced figures: {missing.join(', ')}.</p>}
    {entries.filter(entry => main.includes(entry.id)).map(entry => <FigureCard key={entry.id} entry={entry} countries={countries} />)}
    {extra.length > 0 && <details className="analysis-more" open={more} onToggle={event => setMore(event.currentTarget.open)}>
      <summary>More comparisons from this finding ({extra.length})</summary>
      {more && extra.map(entry => <FigureCard key={entry.id} entry={entry} countries={countries} />)}
    </details>}
  </section>
}
export default function AnalysisPage({ manifest }: { manifest?: Manifest }) {
  const index = useAnalysis('index.json', parseIndex)
  const findings = useAnalysis('findings.json', parseFindings)
  const countries = useMemo(() => new Map(manifest?.locations.map(location => [location.id, location.name]) ?? []), [manifest])
  const error = index.error ?? findings.error
  return <main id="main" className="analysis-page" tabIndex={-1}>
    <header className="analysis-intro"><span className="eyebrow">Visceral / Analysis</span><h1>Where does disease burden appear to fall?</h1>
      <p className="page-lead">How do age structure, sex and analytical choices change the apparent body profile of disease burden?</p>
      <p>Follow five findings from WHO GHE 2023 across 185 countries. These comparisons describe causes attributed to groups; they do not measure organ health or establish why populations differ.</p>
      <div className="button-row"><a className="button-link" href={`${REPO_URL}/tree/main/pipeline/notebooks`}>Explore the notebooks ↗</a><a className="button-link" href={`${REPO_URL}/blob/main/docs/analysis.md`}>Read the full write-up ↗</a></div>
    </header>
    {error ? <div className="analysis-error" role="alert"><h2>Analysis data could not be loaded</h2><p>{error}</p><p>Analysis requires the real export served by <code>npm run dev</code>. The synthetic fixture does not contain these analysis files.</p><button onClick={() => { index.retry(); findings.retry() }}>Retry analysis</button></div>
      : !index.data || !findings.data ? <p role="status">Loading the analysis story…</p> : <>
        <nav className="analysis-contents" aria-label="Findings">{findings.data.findings.map((finding, i) => <button key={finding.id} onClick={() => {
          const heading = document.getElementById(`finding-${finding.id}`)
          if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); heading.scrollIntoView() }
        }}>{String(i + 1).padStart(2, '0')} · {{ 'age-structure': 'Age structure', pandemic: 'Trends', method: 'Methods', patterns: 'Patterns', sex: 'Sex differences' }[finding.id]}</button>)}</nav>
        {findings.data.findings.map((finding, i) => <FindingSection key={finding.id} finding={finding} index={index.data!} countries={countries} ordinal={i + 1} />)}
      </>}
    <aside className="analysis-limits" aria-labelledby="analysis-limits-heading"><h2 id="analysis-limits-heading">Limitations</h2>
      <ul><li>WHO modeled point estimates are shown without source uncertainty intervals. Bootstrap stability and country percentile ranges do not measure that uncertainty.</li>
        <li>Single-underlying-cause attribution simplifies systemic disease and misses multimorbidity. Rare or nearly zero groups can have unstable ratios and ranks; empty groups have undefined correlations.</li>
        <li>Standardizing features gives rare groups influence. Log(1 + rate) depends on the per-100,000 unit; k-means assumes Euclidean structure. The PCA view leaves out much of the feature variance.</li>
        <li>Country deaths use published fine-age rates, while World and DALYs use broad bins. Analytical choices affect the picture; descriptive contrasts do not establish exposure, treatment or health-system effects.</li>
        <li>Eight irregular observations do not support forecasting.</li></ul>
      <a className="button-link" href="#/methodology">How this was computed → Methodology</a>
    </aside>
  </main>
}
