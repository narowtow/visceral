import { lazy, Suspense, useCallback, useId, useState } from 'react'
import Boundary from '../components/Boundary'
import type { FigureEntry } from './data'
import { parseFigure } from './data'
import { useAnalysis } from './useAnalysis'
import { columnNames, defaultControls, explorerHash, figureUnits, groupName, number, selectedRows, summaries } from './presentation'

const AnalysisPlots = lazy(() => import('./AnalysisPlots'))
export default function FigureCard({ entry, countries }: { entry: FigureEntry; countries: ReadonlyMap<string, string> }) {
  const parse = useCallback((value: unknown) => parseFigure(entry.id, value), [entry.id])
  const resource = useAnalysis(entry.file, parse)
  const [controls, setControls] = useState(defaultControls)
  const [table, setTable] = useState(false)
  const unique = useId(), titleId = `${unique}-title`, tableId = `${unique}-table`, summaryId = `${unique}-summary`
  const figure = resource.data
  const rows = figure ? selectedRows(figure, controls) : []
  const columns = rows[0] ? Object.keys(rows[0]) : []
  const measureToggle = figure?.data.some(row => 'measure' in row)
  const displayCell = (key: string, value: unknown) => key === 'organ' ? groupName(String(value)) : key === 'location' ? `${countries.get(String(value)) ?? value} (${value})` : key === 'year' ? String(value) : number(value)
  return <section className={`analysis-figure figure-${entry.id}`} aria-labelledby={titleId}>
    <div className="section-heading"><h3 id={titleId}>{entry.title}</h3><button className="text-button" aria-expanded={table} aria-controls={tableId} onClick={() => setTable(!table)}>{table ? 'Hide table' : 'Show table'}</button></div>
    <p className="analysis-takeaway">{entry.takeaway}</p>
    {figure && <div className="analysis-controls">
      {measureToggle && <fieldset><legend>Measure</legend>{(['deaths', 'dalys'] as const).map(measure => <button key={measure} aria-pressed={controls.measure === measure} onClick={() => setControls({ ...controls, measure })}>{measure === 'deaths' ? 'Deaths' : 'DALYs'}</button>)}</fieldset>}
      {entry.id === 'age-rankings' && <fieldset><legend>Organ group</legend>{(['heart', 'brain'] as const).map(organ => <button key={organ} aria-pressed={controls.organ === organ} onClick={() => setControls({ ...controls, organ })}>{groupName(organ)}</button>)}</fieldset>}
      {entry.id === 'standard-rankings' && <label>Standard<select value={controls.standard} onChange={event => setControls({ ...controls, standard: event.target.value })}>{['WHO2026', 'WHO2021', 'Segi', 'Scandinavian', 'European2013'].map(value => <option key={value}>{value}</option>)}</select></label>}
      {(entry.id === 'sex-ratios' || entry.id === 'age-methods') && <label className="check-label"><input type="checkbox" checked={controls.allGroups} onChange={event => setControls({ ...controls, allGroups: event.target.checked })} />Show all eligible groups</label>}
    </div>}
    <p className="analysis-units">{figureUnits(entry.id, controls)}</p>
    <p id={summaryId} className="analysis-chart-summary">{summaries[entry.id]}</p>
    {resource.error ? <div className="analysis-error" role="alert"><p>{resource.error}</p><button onClick={resource.retry}>Retry {entry.id}</button></div>
      : !figure ? <p role="status">Loading {entry.title}…</p> : <>
        <Boundary fallback={<p role="status">The chart could not render. Open its table to read the values.</p>}>
          <Suspense fallback={<p role="status">Loading interactive chart…</p>}><AnalysisPlots figure={figure} controls={controls} countries={countries} /></Suspense>
        </Boundary>
        {table && <div className="table-scroll analysis-table" id={tableId} role="region" aria-label={`${entry.title} data`} tabIndex={0}>
          <table><caption>{entry.title} · {figureUnits(entry.id, controls)} Source rows for current controls; some charts emphasize selected groups.</caption><thead><tr>{columns.map(column => <th scope="col" key={column}>{columnNames[column] ?? column.replaceAll('_', ' ')}</th>)}{columns.includes('location') && <th scope="col">Explore</th>}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={index}>{Object.entries(row).map(([key, value], i) => i === 0 ? <th key={key} scope="row">{displayCell(key, value)}</th> : <td key={key}>{displayCell(key, value)}</td>)}
              {'location' in row && <td><a href={explorerHash(row.location, 'organ' in row ? row.organ : 'heart', controls.measure)} aria-label={`Explore ${countries.get(row.location) ?? row.location}`}>Explore ↗</a></td>}
            </tr>)}</tbody></table>
        </div>}
        {!rows.length && <p>No rows are available for these controls.</p>}
      </>}
    <p className="analysis-source">WHO GHE 2023; Visceral analysis{figure && <> · {figure.description}</>}</p>
  </section>
}
