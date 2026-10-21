import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, ErrorBar, Legend, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import { interpolateViridis } from 'd3-scale-chromatic'
import type { ReactElement } from 'react'
import { useMedia } from '../lib/useMedia'
import { logTicks } from '../lib/logTicks'
import type { Figure, FigureRows } from './data'
import type { ChartControls } from './presentation'
import { columnNames, compact, explorerHash, focusGroups, globalLines, groupName, number, rangeRow, selectedRows, shortName, standardWinners } from './presentation'

const tick = { fill: 'var(--muted)', fontSize: 11 }
const colors = ['var(--analysis-purple)', 'var(--accent)', 'var(--analysis-lime)']
const margin = { top: 25, right: 20, bottom: 35, left: 6 }
const grid = <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" />
const label = (value: string) => ({ value, fill: 'var(--muted)', fontSize: 11, position: 'insideBottom' as const, offset: -23 })
interface TipProps {
  active?: boolean; label?: unknown; countries: ReadonlyMap<string, string>
  payload?: readonly { payload?: Record<string, unknown> }[]
  names?: Record<string, string>
}
function ChartTip({ active, payload, label: heading, countries, names }: TipProps) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  const title = typeof row.location === 'string' ? countries.get(row.location) ?? row.location : row.label ?? row.standard ?? heading
  return <div className="analysis-tooltip"><strong>{typeof title === 'string' || typeof title === 'number' ? title : ''}</strong>
    {typeof row.organ === 'string' && <p>{groupName(row.organ)}</p>}
    <dl>{Object.entries(row).filter(([, value]) => typeof value === 'number' || value === null).map(([key, value]) => <div key={key}><dt>{names?.[key] ?? columnNames[key] ?? (focusGroups.includes(key) ? groupName(key) : key.replaceAll('_', ' '))}</dt><dd>{key === 'year' ? String(value) : number(value)}</dd></div>)}</dl>
  </div>
}
function Plot({ children, height = 350 }: { children: ReactElement; height?: number }) {
  return <div className="analysis-plot" style={{ height }} aria-hidden="true"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
}
function Key({ items }: { items: { color: string; text: string }[] }) {
  return <div className="analysis-key">{items.map(item => <span key={item.text}><i style={{ background: item.color }} aria-hidden="true" />{item.text}</span>)}</div>
}
const positiveDomain = (values: number[]): [number, number] => {
  const low = 10 ** Math.floor(Math.log10(Math.min(...values)))
  return [low, Math.max(low * 10, 10 ** Math.ceil(Math.log10(Math.max(...values))))]
}
function AgeScatter({ rows, controls, narrow, countries }: { rows: FigureRows['age-rankings'][]; controls: ChartControls; narrow: boolean; countries: ReadonlyMap<string, string> }) {
  const points = rows.filter(row => row.rate > 0 && row.ageStdRate > 0)
  if (!points.length) return <p>No positive paired rates are available for log axes. All rows remain in the table.</p>
  const domain = positiveDomain(points.flatMap(row => [row.rate, row.ageStdRate]))
  const maxAgeShare = Math.max(25, ...rows.map(row => row.population_70_plus))
  const selectedLabels = new Set(narrow ? ['JPN', 'NGA', 'USA'] : ['JPN', 'NGA', 'USA', 'AFG', 'UKR', 'IND'])
  const unit = controls.measure === 'deaths' ? 'deaths' : 'DALYs'
  return <>
    <Plot height={narrow ? 360 : 420}><ScatterChart margin={{ ...margin, left: 12, right: 32 }} accessibilityLayer={false}>
      {grid}<XAxis dataKey="rate" type="number" scale="log" domain={domain} ticks={logTicks(domain)} allowDataOverflow tick={tick} tickFormatter={compact} label={label(`Crude ${unit} / 100,000 (log)`)} />
      <YAxis dataKey="ageStdRate" type="number" scale="log" domain={domain} ticks={logTicks(domain)} allowDataOverflow width={66} tick={tick} tickFormatter={compact} label={{ value: `Standardized ${unit} / 100,000 (log)`, angle: -90, position: 'insideLeft', fill: 'var(--muted)', fontSize: 10 }} />
      <ReferenceLine segment={[{ x: domain[0], y: domain[0] }, { x: domain[1], y: domain[1] }]} stroke="var(--muted)" strokeDasharray="4 4" />
      <Tooltip content={<ChartTip countries={countries} />} />
      <Scatter data={points} name="Countries" isAnimationActive={false} onClick={point => { const row = point.payload as FigureRows['age-rankings']; window.location.hash = explorerHash(row.location, controls.organ, controls.measure) }} shape={props => {
        const { cx, cy, payload: row } = props as { cx: number; cy: number; payload: FigureRows['age-rankings'] }
        return <g><circle cx={cx} cy={cy} r={4.4} fill={interpolateViridis(row.population_70_plus / maxAgeShare)} stroke="var(--text)" strokeWidth={.45} opacity={.9} style={{ cursor: 'pointer' }} />{selectedLabels.has(row.location) && <text x={cx + (row.location === 'JPN' ? -7 : 7)} y={cy - 7} textAnchor={row.location === 'JPN' ? 'end' : 'start'} fill="var(--text)" fontSize={10}>{row.location}</text>}</g>
      }} />
    </ScatterChart></Plot>
    <div className="age-color-key"><span>Aged 70+ (%)</span><div style={{ background: `linear-gradient(to right,${[0, .25, .5, .75, 1].map(interpolateViridis).join(',')})` }} /><span>0 → {number(maxAgeShare)}</span></div>
    {points.length < rows.length && <p className="subtle-note">{rows.length - points.length} zero-rate rows omitted from log axes; retained in the table.</p>}
    <p className="subtle-note">Explore a country by clicking a point or opening its table link. {controls.measure === 'deaths' ? 'Country deaths: WHO published fine-age ASDRs.' : 'DALYs: broad-bin approximation.'}</p>
  </>
}
interface RangePoint { organ: string; label: string; value: number | null; interval?: number[]; world?: number | null }
function Ranges({ rows, unit, narrow, countries, log = false, parity = 0, domain }: { rows: RangePoint[]; unit: string; narrow: boolean; countries: ReadonlyMap<string, string>; log?: boolean; parity?: number; domain?: [number, number] }) {
  const points = rows.filter(row => row.value !== null && (!log || row.value > 0)).map(row => ({ ...row,
    interval: log && row.interval && domain ? [Math.max(0, Math.min(row.interval[0], row.value! - domain[0])), row.interval[1]] : row.interval,
  }))
  if (!points.length) return <p>No defined values are available for this plot.</p>
  const world = points.filter(row => row.world !== undefined && row.world !== null && (!log || row.world > 0)).map(row => ({ ...row, value: row.world }))
  return <>
    <Plot height={Math.max(220, points.length * 29 + 85)}><ScatterChart margin={{ ...margin, top: 12, left: 0 }} accessibilityLayer={false}>
      {grid}<XAxis dataKey="value" type="number" scale={log ? 'log' : 'auto'} domain={domain ?? ['auto', 'auto']} ticks={log && domain ? logTicks(domain) : undefined} tick={tick} tickFormatter={compact} label={label(unit)} />
      <YAxis dataKey="label" type="category" allowDuplicatedCategory={false} width={narrow ? 121 : 155} interval={0} tick={{ ...tick, fontSize: narrow ? 10 : 11 }} />
      <ReferenceLine x={parity} stroke="var(--muted)" strokeDasharray="4 4" />
      <Tooltip content={<ChartTip countries={countries} />} />
      <Scatter data={points} name="Median" fill="var(--accent)" isAnimationActive={false}>
        <ErrorBar dataKey="interval" direction="x" width={3} stroke="var(--muted)" strokeWidth={1.4} />
      </Scatter>
      {world.length > 0 && <Scatter data={world} name="World" shape="diamond" fill="var(--analysis-purple)" isAnimationActive={false} />}
    </ScatterChart></Plot>
    {world.length > 0 && <Key items={[{ text: 'Country median · p05–p95 range', color: 'var(--accent)' }, { text: 'World ratio (diamond)', color: 'var(--analysis-purple)' }]} />}
  </>
}
function Patterns({ rows, narrow, countries }: { rows: FigureRows['country-patterns'][]; narrow: boolean; countries: ReadonlyMap<string, string> }) {
  const labels = new Set(narrow ? ['JPN', 'NGA', 'USA'] : ['JPN', 'NGA', 'USA', 'AFG', 'UKR'])
  return <>
    <Plot height={narrow ? 340 : 410}><ScatterChart margin={margin} accessibilityLayer={false}>
      {grid}<XAxis type="number" dataKey="pc1" domain={['dataMin', 'dataMax']} tick={tick} label={label('PC1 score (31.6% variance)')} />
      <YAxis type="number" dataKey="pc2" domain={['dataMin', 'dataMax']} tick={tick} label={{ value: 'PC2 score (13.1% variance)', angle: -90, position: 'insideLeft', fill: 'var(--muted)', fontSize: 10 }} />
      <Tooltip content={<ChartTip countries={countries} />} />
      <Scatter data={rows} isAnimationActive={false} shape={props => {
        const { cx, cy, payload: row } = props as { cx: number; cy: number; payload: FigureRows['country-patterns'] }
        return <g>{row.cluster === 1 ? <circle cx={cx} cy={cy} r={4.5} fill="var(--accent)" /> : <path d={`M${cx},${cy - 5}l5,5 -5,5 -5,-5Z`} fill="var(--analysis-purple)" />}{labels.has(row.location) && <text x={cx + 7} y={cy - 6} fill="var(--text)" fontSize={10}>{row.location}</text>}</g>
      }} />
    </ScatterChart></Plot>
    <Key items={[1, 2].map(cluster => ({ color: cluster === 1 ? 'var(--accent)' : 'var(--analysis-purple)', text: `Pattern ${cluster} (${rows.filter(row => row.cluster === cluster).length} countries; ${cluster === 1 ? 'circles' : 'diamonds'})` }))} />
  </>
}
function BarProfiles({ rows, narrow, countries, mapping = false }: { rows: { label: string; a: number; b: number }[]; narrow: boolean; countries: ReadonlyMap<string, string>; mapping?: boolean }) {
  return <><Plot height={rows.length * 37 + 85}><BarChart data={rows} layout="vertical" margin={{ ...margin, left: 0 }} accessibilityLayer={false}>
    {grid}<XAxis type="number" tick={tick} label={label(mapping ? 'Share of primary burden (%)' : 'Standardized log(1 + rate), z score')} />
    <YAxis type="category" dataKey="label" width={narrow ? 121 : 155} tick={{ ...tick, fontSize: narrow ? 10 : 11 }} interval={0} />
    <ReferenceLine x={0} stroke="var(--muted)" /><Tooltip content={<ChartTip countries={countries} names={{ a: mapping ? 'Baseline share (%)' : 'Pattern 1 z score', b: mapping ? 'Alternative share (%)' : 'Pattern 2 z score' }} />} />
    <Bar name={mapping ? 'Baseline' : 'Pattern 1'} dataKey="a" fill="var(--accent)" isAnimationActive={false} />
    <Bar name={mapping ? 'Alternative' : 'Pattern 2'} dataKey="b" fill="var(--analysis-purple)" isAnimationActive={false} />
  </BarChart></Plot><Key items={[{ color: 'var(--accent)', text: mapping ? 'Baseline attribution' : 'Pattern 1' }, { color: 'var(--analysis-purple)', text: mapping ? 'Alternative attribution' : 'Pattern 2' }]} /></>
}
export default function AnalysisPlots({ figure, controls, countries }: { figure: Figure; controls: ChartControls; countries: ReadonlyMap<string, string> }) {
  const narrow = useMedia('(max-width: 600px)')
  const selected = selectedRows(figure, controls)
  if (!selected.length) return <p>No observations match these controls.</p>
  const tooltip = <Tooltip content={<ChartTip countries={countries} />} />
  switch (figure.id) {
    case 'age-rankings': return <AgeScatter rows={selected as FigureRows['age-rankings'][]} controls={controls} narrow={narrow} countries={countries} />
    case 'country-patterns': return <Patterns rows={selected as FigureRows['country-patterns'][]} narrow={narrow} countries={countries} />
    case 'age-methods': {
      const rows = (selected as FigureRows['age-methods'][]).filter(row => row.median !== null).map(row => rangeRow(row.organ, row.median, row.p05, row.p95)).sort((a, b) => (a.value ?? Infinity) - (b.value ?? Infinity)).slice(0, controls.allGroups ? undefined : 12)
      return <Ranges rows={rows} unit="Broad-bin − published ASDR (%)" countries={countries} narrow={narrow} />
    }
    case 'country-trends': {
      const rows = (selected as FigureRows['country-trends'][]).map(row => rangeRow(row.organ, row.median, row.p05, row.p95)).sort((a, b) => (a.value ?? Infinity) - (b.value ?? Infinity))
      return <Ranges rows={rows} unit="ASDR change, 2000–2019 (%)" countries={countries} narrow={narrow} />
    }
    case 'sex-ratios': {
      const rows = (selected as FigureRows['sex-ratios'][]).map(row => ({ ...rangeRow(row.organ, row.median, row.p05, row.p95), world: row.world_ratio })).sort((a, b) => (b.world ?? -Infinity) - (a.world ?? -Infinity))
      // Domain includes country tails as well as World, so no interval is clipped.
      const values = (selected as FigureRows['sex-ratios'][]).flatMap(row => [row.p05, row.median, row.p95, row.world_ratio]).filter((value): value is number => value !== null && value > 0)
      if (!values.length) return <p>No positive ratios are available for log axes.</p>
      return <Ranges rows={rows} unit="Male / female ASDR ratio (log)" countries={countries} narrow={narrow} log parity={1} domain={positiveDomain([...values, 1])} />
    }
    case 'global-trends': return <><Plot height={narrow ? 330 : 380}><LineChartWrapper data={globalLines(selected as FigureRows['global-trends'][])} unit={`${controls.measure === 'deaths' ? 'Deaths' : 'DALYs'} / 100,000`} countries={countries} /></Plot><Key items={focusGroups.map((organ, i) => ({ color: colors[i], text: groupName(organ) }))} /></>
    case 'pandemic-decomposition': {
      const rows = [...selected as FigureRows['pandemic-decomposition'][]].sort((a, b) => a.year - b.year)
      return <><Plot height={280}><ComposedChart data={rows} stackOffset="sign" margin={margin} accessibilityLayer={false}>
        {grid}<XAxis dataKey="year" tick={tick} label={label('Observed year (minus 2019)')} /><YAxis tick={tick} tickFormatter={compact} width={60} label={{ value: 'ASDR change / 100,000', angle: -90, position: 'insideLeft', fill: 'var(--muted)', fontSize: 10 }} />
        <ReferenceLine y={0} stroke="var(--muted)" />{tooltip}<Bar dataKey="cause_change" name="COVID-19" stackId="change" fill="var(--analysis-purple)" isAnimationActive={false} /><Bar dataKey="other_change" name="Other lung causes" stackId="change" fill="var(--accent)" isAnimationActive={false} />
        <Line dataKey="change" name="Net change" stroke="none" dot={{ r: 5, fill: 'var(--text)' }} isAnimationActive={false} />
      </ComposedChart></Plot><Key items={[{ color: 'var(--analysis-purple)', text: 'COVID-19 change' }, { color: 'var(--accent)', text: 'Other mapped lung causes' }, { color: 'var(--text)', text: 'Net change (dot)' }]} /></>
    }
    case 'cluster-selection': {
      const rows = (selected as FigureRows['cluster-selection'][]).map(row => ({ ...row, interval: [row.ari_median - row.ari_p05, row.ari_p95 - row.ari_median] }))
      return <Plot height={280}><ComposedChart data={rows} margin={margin} accessibilityLayer={false}>
        {grid}<XAxis dataKey="k" type="number" domain={[2, 8]} ticks={[2, 3, 4, 5, 6, 7, 8]} tick={tick} label={label('Number of patterns, k')} /><YAxis domain={[0, 1]} tick={tick} label={{ value: 'Score (unitless)', angle: -90, position: 'insideLeft', fill: 'var(--muted)', fontSize: 10 }} />
        <ReferenceLine x={2} stroke="var(--muted)" strokeDasharray="3 4" />{tooltip}<Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        <Line dataKey="silhouette" name="Silhouette" stroke="var(--accent)" dot={{ r: 3 }} isAnimationActive={false} />
        <Line dataKey="ari_median" name="Bootstrap ARI median" stroke="var(--analysis-purple)" strokeDasharray="4 3" dot={{ r: 3 }} isAnimationActive={false}><ErrorBar dataKey="interval" direction="y" width={3} stroke="var(--analysis-purple)" /></Line>
      </ComposedChart></Plot>
    }
    case 'cluster-centroids': {
      const source = selected as FigureRows['cluster-centroids'][]
      const rows = [...new Set(source.map(row => row.organ))].map(organ => ({ label: shortName(organ), a: source.find(row => row.organ === organ && row.cluster === 1)!.z, b: source.find(row => row.organ === organ && row.cluster === 2)!.z })).sort((a, b) => Math.abs(b.a - b.b) - Math.abs(a.a - a.b)).slice(0, 12)
      return <BarProfiles rows={rows} narrow={narrow} countries={countries} />
    }
    case 'standards-mapping': {
      const keep = ['heart', 'lungs', 'brain', 'other_unallocated', 'infections_systemic', 'pancreas', 'mental_substance']
      const rows = (selected as FigureRows['standards-mapping'][]).filter(row => keep.includes(row.organ)).sort((a, b) => b.count_share_base - a.count_share_base).map(row => ({ label: shortName(row.organ), a: row.count_share_base, b: row.count_share_alt }))
      return <BarProfiles rows={rows} narrow={narrow} countries={countries} mapping />
    }
    case 'standard-organ-rankings': {
      const rows = standardWinners(selected as FigureRows['standard-organ-rankings'][])
      return <Plot height={300}><BarChart data={rows} layout="vertical" margin={margin} accessibilityLayer={false}>
        {grid}<XAxis type="number" tick={tick} tickFormatter={compact} label={label(`${controls.measure === 'deaths' ? 'Deaths' : 'DALYs'} ASDR / 100,000`)} /><YAxis dataKey="label" type="category" width={narrow ? 125 : 175} tick={{ ...tick, fontSize: 10 }} interval={0} />
        {tooltip}<Bar dataKey="ageStdRate" name="First-ranked group" isAnimationActive={false}>{rows.map(row => <Cell key={row.standard} fill={row.organ === 'heart' ? 'var(--analysis-purple)' : 'var(--accent)'} />)}</Bar>
      </BarChart></Plot>
    }
    case 'rank-correlations':
    case 'standard-rankings': {
      const source = selected as FigureRows['rank-correlations'][]
      const rows = source.map(row => rangeRow(row.organ, row.rho, null, null)).sort((a, b) => (a.value ?? Infinity) - (b.value ?? Infinity))
      return <Ranges rows={rows} unit="Spearman rank correlation, ρ (unitless)" narrow={narrow} countries={countries} domain={[-1, 1]} />
    }
    case 'organ-rankings': {
      const rows = selected as FigureRows['organ-rankings'][]
      return <Plot><ScatterChart margin={margin} accessibilityLayer={false}>
        {grid}<XAxis dataKey="max_abs_rank_change" type="number" tick={tick} label={label('Largest absolute group-rank shift (places)')} /><YAxis dataKey="rho" type="number" domain={[0, 1]} tick={tick} label={{ value: 'Spearman ρ (unitless)', angle: -90, position: 'insideLeft', fill: 'var(--muted)', fontSize: 10 }} />{tooltip}<Scatter data={rows.filter(row => row.rho !== null)} fill="var(--accent)" isAnimationActive={false} />
      </ScatterChart></Plot>
    }
  }
}
function LineChartWrapper({ data, unit, countries, ...props }: { data: ReturnType<typeof globalLines>; unit: string; countries: ReadonlyMap<string, string> }) {
  return <ComposedChart {...props} data={data} margin={margin} accessibilityLayer={false}>
    {grid}<XAxis type="number" dataKey="year" domain={['dataMin', 'dataMax']} ticks={[2000, 2010, 2015, 2019, 2023]} minTickGap={20} tick={tick} label={label('Year (observed time points)')} />
    <YAxis tick={tick} tickFormatter={compact} width={64} label={{ value: unit, angle: -90, position: 'insideLeft', fill: 'var(--muted)', fontSize: 10 }} />
    <ReferenceArea x1={2020} x2={2021} fill="var(--muted)" fillOpacity={.15} />
    <Tooltip content={<ChartTip countries={countries} />} />
    {focusGroups.map((organ, i) => <Line key={organ} dataKey={organ} name={groupName(organ)} stroke={colors[i]} strokeWidth={2.2} strokeDasharray={i === 0 ? undefined : i === 1 ? '6 3' : '2 2'} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />)}
  </ComposedChart>
}
