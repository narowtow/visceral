import { lazy, Suspense, useState } from 'react'
import { organs } from '../data/contract'
import type { Causes, LocationShard, Manifest, Selection, Value } from '../data/contract'
import { leadingCauses, ranking, selectedValue, trend } from '../data/selectors'
import OrganEducation from './OrganEducation'
import { WHO_URL } from '../content/sources'
import { formatBurden, formatValue, units } from '../lib/format'
import { useExplorer } from '../state/store'
const TrendChart = lazy(() => import('./Charts').then(m => ({ default: m.TrendChart })))
const RankedChart = lazy(() => import('./Charts').then(m => ({ default: m.RankedChart })))

export default function OrganPanel({ manifest, shard, selection, causes, color }: { manifest: Manifest; shard?: LocationShard; selection: Selection; causes?: Causes; color: (v: Value) => string }) {
  const [causeTable, setCauseTable] = useState(false)
  const selectOrgan = useExplorer(s => s.selectOrgan)
  const setFilters = useExplorer(s => s.setFilters)
  const organ = organs.find(o => o.id === selection.selectedOrgan)
  const value = organ ? selectedValue(shard, selection, organ.id) : null
  const displayValue = formatBurden(value)
  const top = organ ? leadingCauses(shard, selection, organ.id) : []
  // The contract has no age-standardized cause rates: use explicitly labeled counts.
  const causeMetric = selection.metric === 'rate' ? 'rate' : 'count'
  const causeUnit = units({ ...selection, metric: causeMetric })
  const maxCause = Math.max(1, ...top.map(c => c[causeMetric] ?? 0))
  return <aside className="detail-panel" aria-labelledby="detail-title">
    {organ ? <>
      <div className="detail-title-row"><span className="organ-emblem" style={{ color: color(value) }} aria-hidden="true">{organ.kind === 'systemic' ? '◈' : '◉'}</span><div><span className="eyebrow">{organ.kind === 'systemic' ? 'Systemic & other' : organ.system}</span><h2 className="detail-heading" id="detail-title" tabIndex={-1}>{organ.label}</h2></div><button className="icon-button close-selection" aria-label="Clear selection and show overview" onClick={() => selectOrgan(null)}>×</button></div>
      <OrganEducation id={organ.id} />
      {!organ.modeled && <p className="subtle-note">This group is available in the list and charts; it has no model mesh.</p>}
      <div className="stat-block">
        <h3>{units(selection)}</h3>
        <div className={`big-stat ${value === null ? 'unavailable' : ''}`}>{displayValue}<span>{value !== null && (selection.metric === 'count' ? selection.measure : 'per 100k')}</span></div>
        {value === null && <p className="muted">Unavailable for these filters. Missing values are not zero.</p>}
        {displayValue === '<0.1' && <p className="subtle-note">Zero and values that round to zero are displayed as &lt;0.1.</p>}
      </div>
      {selection.measure === 'deaths' && ['eyes', 'ears'].includes(organ.id) && <div className="disability-hint">
        <p>Burden for this group is mostly disability, not deaths. Try DALYs.</p>
        <button onClick={() => {
          setFilters({ measure: 'dalys' }, manifest)
          document.getElementById('detail-title')?.focus()
        }}>Show DALYs</button>
      </div>}
      <Suspense fallback={<p className="loading">Loading trend…</p>}><TrendChart data={trend(shard, manifest.years, selection, organ.id)} unit={units(selection)} /></Suspense>
      <section className="causes"><div className="section-heading"><h3>Leading causes</h3>{top.length > 0 && <button className="text-button" aria-expanded={causeTable} onClick={() => setCauseTable(!causeTable)}>{causeTable ? 'Hide table' : 'Show table'}</button>}</div>
        <p className="subtle-note">{selection.age !== 'all' ? 'Cause breakdowns are available for All ages only.' : `All ages · ${causeUnit}. Ranked by total burden; up to five causes.`}</p>
        {selection.metric === 'ageStdRate' && selection.age === 'all' && <p className="subtle-note">Age-standardized cause rates are not available; totals are shown.</p>}
        {selection.age === 'all' && !top.length && <p className="muted">No cause breakdown available for this group.</p>}
        {top.map(c => <div className="cause-row" key={c.code}><span>{causes?.causes.find(n => n.code === c.code)?.name ?? `Cause ${c.code}`}</span><span className="cause-track" aria-hidden="true"><span style={{ width: `${(c[causeMetric] ?? 0) / maxCause * 100}%` }} /></span><strong title={formatValue(c[causeMetric])}>{formatValue(c[causeMetric], true)}</strong></div>)}
        {causeTable && top.length > 0 && <table><caption>Leading causes · {causeUnit} · All ages</caption><thead><tr><th>Cause</th><th>Value</th></tr></thead><tbody>{top.map(c => <tr key={c.code}><th scope="row">{causes?.causes.find(n => n.code === c.code)?.name ?? `Cause ${c.code}`}</th><td>{formatValue(c[causeMetric])}</td></tr>)}</tbody></table>}
      </section>
      {organ.relatedOrgans.length > 0 && <section className="related"><h3>Related organs</h3>{organ.relatedOrgans.map(id => <button key={id} className="chip" onClick={() => selectOrgan(id)}>{organs.find(o => o.id === id)?.label}</button>)}</section>}
    </> : <><span className="eyebrow">The whole picture</span><h2 className="detail-heading" id="detail-title">Explore the burden</h2><p className="organ-description">Compare mapped causes across organ groups. Select a group in the body, list or chart for details.</p><Suspense fallback={<p>Loading overview…</p>}><RankedChart rows={ranking(shard, selection)} unit={units(selection)} color={color} onSelect={selectOrgan} /></Suspense></>}
    <div className="source-note"><p>Source: <a href={WHO_URL} target="_blank" rel="noreferrer">WHO Global Health Estimates 2023 ↗</a></p><p>Values are burden associated with causes mapped to this organ group; see <a href={`#/methodology${window.location.hash.includes('?') ? `?${window.location.hash.split('?')[1]}` : ''}`}>Methodology</a>.</p>{manifest.datasetRelease.includes('FIXTURE') && <p className="fixture-note">Currently displaying synthetic fixture data, not WHO estimates.</p>}</div>
  </aside>
}
