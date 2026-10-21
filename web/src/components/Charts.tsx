import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Value } from '../data/contract'
import { formatValue } from '../lib/format'
interface Row { id: string; label: string; value: Value }
export function TrendChart({ data, unit }: { data: { year: number; value: Value }[]; unit: string }) {
  const [table, setTable] = useState(false)
  const available = data.filter(d => d.value !== null)
  return <section className="chart-section" aria-label="Trend">
    <div className="section-heading"><h3>{data[0]?.year}–{data.at(-1)?.year}</h3><button className="text-button" aria-expanded={table} onClick={() => setTable(!table)}>{table ? 'Hide table' : 'Show table'}</button></div>
    <p className="sr-only">{unit}. {available.length ? `First available: ${available[0].year}, ${formatValue(available[0].value)}. Last available: ${available.at(-1)?.year}, ${formatValue(available.at(-1)?.value ?? null)}.` : 'No trend data available.'} Missing years are gaps. A data table follows when expanded.</p>
    <div className="trend-chart" aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 10, right: 14, left: 0, bottom: 5 }} accessibilityLayer={false}>
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" /><XAxis type="number" dataKey="year" domain={['dataMin', 'dataMax']} tickCount={5} allowDecimals={false} minTickGap={20} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
      <YAxis width={48} tickFormatter={n => formatValue(n, true)} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
      <Tooltip contentStyle={{ background: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--text)' }} formatter={value => [formatValue(typeof value === 'number' ? value : null), unit]} />
      <Line type="linear" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent)' }} connectNulls={false} isAnimationActive={false} />
    </LineChart></ResponsiveContainer></div>
    {table && <table><caption>{unit} by year</caption><thead><tr><th>Year</th><th>Value</th></tr></thead><tbody>{data.map(row => <tr key={row.year}><th scope="row">{row.year}</th><td>{formatValue(row.value)}</td></tr>)}</tbody></table>}
  </section>
}
export function RankedChart({ rows, unit, color, onSelect }: { rows: Row[]; unit: string; color: (value: Value) => string; onSelect: (id: string) => void }) {
  const [table, setTable] = useState(false)
  const maximum = Math.max(1, ...rows.map(row => row.value ?? 0))
  return <section className="chart-section" aria-label="Ranked organ groups"><div className="section-heading"><h3>Burden by organ group</h3><button className="text-button" aria-expanded={table} onClick={() => setTable(!table)}>{table ? 'Hide table' : 'Show table'}</button></div>
    <p className="muted">{unit}. Descending order; unavailable groups follow. Select a group to explore.</p>
    <div className="rank-chart">{rows.map(row => <button key={row.id} className="ranking-row" onClick={() => onSelect(row.id)} aria-label={`${row.label}: ${formatValue(row.value)}. Select organ group.`}>
      <span className="ranking-label">{row.label}</span><span className="ranking-value">{formatValue(row.value, true)}</span>
      <span className="ranking-track" aria-hidden="true"><span className={row.value === null ? 'missing' : ''} style={{ width: `${row.value === null ? 100 : row.value / maximum * 100}%`, backgroundColor: color(row.value) }} /></span>
    </button>)}</div>
    {table && <table><caption>{unit}</caption><thead><tr><th>Organ group</th><th>Value</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><th scope="row"><button className="text-button" onClick={() => onSelect(row.id)}>{row.label}</button></th><td>{formatValue(row.value)}</td></tr>)}</tbody></table>}
  </section>
}
