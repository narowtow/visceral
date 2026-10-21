import type { Value } from '../data/contract'
import { useExplorer } from '../state/store'
import OrganList from './OrganList'

interface Props {
  values: Record<string, Value>
  color: (value: Value) => string
  onClose?: () => void
}
const layerSymbols = { skin: '♙', skeleton: '╂', organs: '◉' }

export default function OrganBrowser({ values, color, onClose }: Props) {
  const selected = useExplorer(s => s.selection.selectedOrgan)
  const selectOrgan = useExplorer(s => s.selectOrgan)
  const layers = useExplorer(s => s.layers)
  const toggleLayer = useExplorer(s => s.toggleLayer)

  return <>
    <div className="sidebar-heading">
      <span className="eyebrow">Find an organ</span>
      {onClose && <button className="icon-button" aria-label="Close organ list" onClick={onClose}>×</button>}
    </div>
    <OrganList selected={selected} values={values} color={color} selectOrgan={selectOrgan} onSelected={onClose} />
    <section className="layers">
      <h2>Visualization layers</h2>
      {(['skin', 'skeleton', 'organs'] as const).map(layer => <label className="layer-toggle" key={layer}>
        <span aria-hidden="true">{layerSymbols[layer]}</span>
        {layer[0].toUpperCase() + layer.slice(1)}
        <input type="checkbox" role="switch" checked={layers[layer]} onChange={() => toggleLayer(layer)} />
        <span className="switch-track" aria-hidden="true" />
      </label>)}
      <p className="layer-note">Skin and skeleton use neutral colors. Select either group or show its layer alone to see its data color.</p>
    </section>
  </>
}
