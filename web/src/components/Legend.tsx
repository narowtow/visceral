import { organs } from '../data/contract'
import type { Selection, Value } from '../data/contract'
import { formatScaleTick } from '../lib/colorScale'
import type { createColorScale } from '../lib/colorScale'
import { formatBurden, formatValue } from '../lib/format'
import { useExplorer } from '../state/store'

interface Props {
  selection: Selection
  context: string
  population: Value
  loading: boolean
  values: Record<string, Value>
  scale: ReturnType<typeof createColorScale>
}

export default function Legend({ selection, context, population, loading, values, scale }: Props) {
  const rescale = useExplorer(s => s.rescale)
  const toggleRescale = useExplorer(s => s.toggleRescale)
  const selectOrgan = useExplorer(s => s.selectOrgan)

  return <div className="legend">
    <p className="population-context">{context}</p>
    <p className="subtle-note">Population: {formatValue(population)}{loading && ' · Loading data…'}</p>
    <div className="color-key">
      <div className="scale-key">
        <div className="scale-gradient" style={{ background: scale.gradient }} />
        <div className="scale-ticks">{scale.tickLabels.map((tick, i) => <span key={tick.value} style={{ left: `${tick.position}%`, transform: `translateX(${i === 0 ? '0' : i === scale.tickLabels.length - 1 ? '-100%' : '-50%'})` }}>{tick.label}</span>)}</div>
      </div>
      <div className="missing-key"><span className="missing" style={{ backgroundColor: scale.color(null) }} />No data</div>
    </div>
    {scale.lowerClamped && <p className="subtle-note">Display floor: {formatScaleTick(scale.domain[0])} (maximum ÷ 1,000). Lower values share the lowest color; printed values are unchanged.</p>}
    <div className="legend-settings">
      <span>{scale.logarithmic ? 'Logarithmic' : 'Linear'} scale · {rescale ? 'Current filters' : 'Fixed across filters'}</span>
      <label><input type="checkbox" checked={rescale} onChange={toggleRescale} /> Rescale to current selection</label>
    </div>
    {rescale && <p className="subtle-note">Colors now use the current filters; they are no longer comparable across selections.</p>}
    <div className="systemic-strip">
      <h2>Systemic & other</h2>
      <div>{organs.filter(o => o.kind === 'systemic').map(organ => <button
        key={organ.id} className="systemic-chip" aria-pressed={selection.selectedOrgan === organ.id}
        onClick={() => selectOrgan(organ.id)}
      >
        <span className={`swatch ${values[organ.id] === null ? 'missing' : ''}`} style={{ backgroundColor: scale.color(values[organ.id]) }} aria-hidden="true" />
        <span>{organ.label}</span><strong>{formatBurden(values[organ.id], true)}</strong>
      </button>)}</div>
    </div>
  </div>
}
