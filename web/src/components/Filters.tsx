import { useEffect, useRef, useState } from 'react'
import type { Manifest, Selection } from '../data/contract'
import { useExplorer } from '../state/store'

function CountrySelect({ manifest, selection }: { manifest: Manifest; selection: Selection }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const wrapper = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const setFilters = useExplorer(s => s.setFilters)
  const locations = [...manifest.locations].sort((a, b) => a.id === 'WLD' ? -1 : b.id === 'WLD' ? 1 : a.name.localeCompare(b.name))
    .filter(l => `${l.name} ${l.id}`.toLowerCase().includes(query.toLowerCase()))
  useEffect(() => {
    if (open) input.current?.focus()
    const close = (e: PointerEvent) => { if (!wrapper.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  useEffect(() => {
    if (open && locations[active]) wrapper.current?.querySelector(`#country-${locations[active].id}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [active, open, locations])
  const choose = (id: string) => { setFilters({ location: id }, manifest); setOpen(false); button.current?.focus() }
  return <div className="country-select" ref={wrapper} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
    <span className="filter-label" id="country-label">Country</span>
    <button ref={button} className="country-button" aria-labelledby="country-label country-value" aria-expanded={open} aria-controls="country-popup" aria-haspopup="dialog" onClick={() => { setOpen(!open); setQuery(''); setActive(0) }}><span aria-hidden="true">◎</span><span id="country-value">{manifest.locations.find(l => l.id === selection.location)?.name}</span><span aria-hidden="true">⌄</span></button>
    {open && <div className="country-popup" id="country-popup" role="dialog" aria-label="Choose country" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); setOpen(false); button.current?.focus() } }}>
      <input ref={input} role="combobox" aria-label="Search countries" aria-expanded="true" aria-autocomplete="list" aria-controls="country-options" aria-activedescendant={locations[active] ? `country-${locations[active].id}` : undefined} placeholder="Search countries…" value={query} onChange={e => { setQuery(e.target.value); setActive(0) }} onKeyDown={e => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive(n => Math.max(0, Math.min(locations.length - 1, n + (e.key === 'ArrowDown' ? 1 : -1)))) }
        if (e.key === 'Enter' && locations[active]) { e.preventDefault(); choose(locations[active].id) }
      }} />
      <ul id="country-options" role="listbox" aria-label="Countries">{locations.map((l, i) => <li id={`country-${l.id}`} role="option" aria-selected={selection.location === l.id} className={active === i ? 'active-country' : ''} key={l.id} onMouseDown={e => e.preventDefault()} onClick={() => choose(l.id)}>{l.name}<small>{l.id}</small></li>)}</ul>
      {!locations.length && <p>No matching countries.</p>}
    </div>}
  </div>
}
export default function Filters({ manifest, selection }: { manifest: Manifest; selection: Selection }) {
  const setFilters = useExplorer(s => s.setFilters)
  const fields = [
    { key: 'sex' as const, label: 'Sex', options: manifest.sexes },
    { key: 'age' as const, label: 'Age group', options: manifest.ageGroups },
    { key: 'year' as const, label: 'Year', options: [...manifest.years].reverse().map(year => ({ id: String(year), label: String(year) })) },
    { key: 'measure' as const, label: 'Measure', options: manifest.measures },
    { key: 'metric' as const, label: 'Metric', options: manifest.metrics },
  ]
  return <div className="filter-grid"><CountrySelect manifest={manifest} selection={selection} />
    {fields.map(field => <label className="filter" key={field.key}><span>{field.label}</span><select value={selection[field.key]} aria-describedby={field.key === 'metric' ? 'metric-help' : undefined} onChange={e => setFilters({ [field.key]: field.key === 'year' ? Number(e.target.value) : e.target.value }, manifest)}>
      {field.options.map(o => <option key={o.id} value={o.id} disabled={o.id === 'ageStdRate' && selection.age !== 'all'}>{o.label}</option>)}
    </select></label>)}
    <p id="metric-help" className="metric-help">Age-standardized rates require All ages.{selection.age !== 'all' && ' Showing an age-specific rate or total.'}</p>
  </div>
}
