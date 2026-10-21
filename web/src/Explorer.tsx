import { useMemo, useRef } from 'react'
import { organs } from './data/contract'
import type { Causes, LocationShard, Manifest } from './data/contract'
import { useResource } from './data/useResource'
import { populationFor, selectedValue } from './data/selectors'
import { createColorScale, currentDomain } from './lib/colorScale'
import { formatBurden, units } from './lib/format'
import { useMedia } from './lib/useMedia'
import { useExplorer } from './state/store'
import BodyViewport from './components/BodyViewport'
import Filters from './components/Filters'
import Legend from './components/Legend'
import OrganBrowser from './components/OrganBrowser'
import OrganPanel from './components/OrganPanel'

export default function Explorer({ manifest, theme }: { manifest: Manifest; theme: 'dark' | 'light' }) {
  const selection = useExplorer(s => s.selection)
  const rescale = useExplorer(s => s.rescale)
  const shard = useResource<LocationShard>(`locations/${selection.location}.json`)
  const causes = useResource<Causes>('causes.json')
  const narrow = useMedia('(max-width: 1000px)')
  const drawer = useRef<HTMLDialogElement>(null)

  // Never show the previous country's values while a new shard is loading.
  const data = shard.data?.location === selection.location ? shard.data : undefined
  const values = useMemo(() => Object.fromEntries(
    organs.map(organ => [organ.id, selectedValue(data, selection, organ.id)]),
  ), [data, selection])
  const domain = useMemo(() => rescale
    ? currentDomain(organs.filter(o => o.kind === 'organ').map(o => values[o.id]))
    : manifest.colorDomains[`${selection.measure}.${selection.metric}`],
  [rescale, values, manifest, selection.measure, selection.metric])
  const scale = useMemo(() => createColorScale(domain, theme), [domain, theme])
  const location = manifest.locations.find(l => l.id === selection.location)?.name
  const context = [
    units(selection), location,
    manifest.sexes.find(s => s.id === selection.sex)?.label,
    manifest.ageGroups.find(a => a.id === selection.age)?.label,
    selection.year,
  ].join(' · ')
  const selected = organs.find(o => o.id === selection.selectedOrgan)

  return <main id="main" className="explore-page" tabIndex={-1}>
    <h1 className="sr-only route-heading">Explore population-level burden</h1>
    <details className="filters-sheet" open={!narrow}>
      <summary>Filters <span>{location} · {selection.year}</span></summary>
      <Filters manifest={manifest} selection={selection} />
    </details>
    {shard.error && <div className="error-banner" role="alert">
      {shard.error} <button onClick={shard.retry}>Retry location data</button>
    </div>}
    {causes.error && <div className="error-banner" role="alert">
      Cause names could not be loaded. <button onClick={causes.retry}>Retry cause names</button>
    </div>}
    <div className="explorer-grid">
      {narrow ? <dialog
        className="organ-drawer" aria-label="Organ browser" ref={drawer}
        onClick={e => { if (e.target === e.currentTarget) drawer.current?.close() }}
      >
        <div className="drawer-content"><OrganBrowser values={values} color={scale.color} onClose={() => drawer.current?.close()} /></div>
      </dialog> : <aside className="left-sidebar" aria-label="Organ browser">
        <OrganBrowser values={values} color={scale.color} />
      </aside>}
      <section className="body-column" aria-label="Anatomy and color key">
        <BodyViewport values={values} color={scale.color} theme={theme} narrow={narrow} openList={() => drawer.current?.showModal()} />
        <Legend selection={selection} context={context} population={populationFor(data, selection)}
          loading={!data && !shard.error} values={values} scale={scale} />
      </section>
      <OrganPanel manifest={manifest} shard={data} selection={selection} causes={causes.data} color={scale.color} />
    </div>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {selected?.label ?? 'Overview'} selected. {context}. {selected ? `${formatBurden(values[selected.id])}.` : ''}
    </div>
  </main>
}
