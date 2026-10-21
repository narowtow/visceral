import { useId, useRef, useState } from 'react'
import { organs } from '../data/contract'
import type { Organ, Value } from '../data/contract'
import { formatBurden, formatValue } from '../lib/format'
interface Props {
  selected: string | null; values: Record<string, Value>; color: (v: Value) => string
  selectOrgan: (id: string) => void; onSelected?: () => void
  options?: Organ[]; showValues?: boolean
}
export default function OrganList({ selected, values, color, selectOrgan, onSelected, options = organs, showValues = true }: Props) {
  const inputId = useId()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('anatomical')
  const refs = useRef<Map<string, HTMLDivElement>>(new Map())
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  if (sort === 'value') filtered.sort((a, b) => (values[b.id] ?? -Infinity) - (values[a.id] ?? -Infinity))
  const active = filtered.some(o => o.id === selected) ? selected : filtered[0]?.id
  const choose = (id: string) => { selectOrgan(id); onSelected?.() }
  return <div className="organ-list">
    <label className="search-label" htmlFor={inputId}><span aria-hidden="true">⌕</span><span className="sr-only">Search organ groups</span><input id={inputId} type="search" placeholder="Search organ groups…" value={search} onChange={e => setSearch(e.target.value)} /></label>
    <div className="list-caption"><span>{filtered.length} organ groups</span>{showValues && <><label className="sr-only" htmlFor={`${inputId}-sort`}>Sort organs</label><select id={`${inputId}-sort`} value={sort} onChange={e => setSort(e.target.value)}><option value="anatomical">Anatomical</option><option value="value">By value</option></select></>}</div>
    <div role="listbox" aria-label="Organ groups" aria-orientation="vertical" className="organ-options">
      {filtered.map((organ, i) => <div key={organ.id} role="option" aria-selected={selected === organ.id} tabIndex={organ.id === active ? 0 : -1}
        ref={node => { if (node) refs.current.set(organ.id, node); else refs.current.delete(organ.id) }}
        className={`organ-option ${selected === organ.id ? 'selected' : ''}`}
        onClick={() => choose(organ.id)} onKeyDown={e => {
          let next = i
          if (e.key === 'ArrowDown') next = (i + 1) % filtered.length
          else if (e.key === 'ArrowUp') next = (i - 1 + filtered.length) % filtered.length
          else if (e.key === 'Home') next = 0
          else if (e.key === 'End') next = filtered.length - 1
          else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(organ.id); return }
          else return
          e.preventDefault(); refs.current.get(filtered[next].id)?.focus()
        }}>
        <span className={`swatch ${showValues && values[organ.id] == null ? 'missing' : ''}`} style={{ backgroundColor: color(values[organ.id] ?? null) }} aria-hidden="true" />
        <span className="organ-option-name">{organ.label}{(!organ.modeled || organ.kind === 'systemic') && <small>{organ.kind === 'systemic' ? 'Systemic' : 'List only'}</small>}</span>
        {showValues && <span className="list-value" title={`Source value: ${formatValue(values[organ.id] ?? null)}`}>{formatBurden(values[organ.id] ?? null, true)}</span>}
      </div>)}
    </div>
    {!filtered.length && <p className="muted">No matching organ groups.</p>}
  </div>
}
