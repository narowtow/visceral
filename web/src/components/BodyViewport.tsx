import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { organs } from '../data/contract'
import type { Layer, Value } from '../data/contract'
import { useExplorer } from '../state/store'
import type { SceneApi } from '../scene/BodyScene'
import Boundary from './Boundary'

const BodyScene = lazy(() => import('../scene/BodyScene'))
const rotations = [
  { label: 'Rotate left', symbol: '↶', x: -Math.PI / 8, y: 0 },
  { label: 'Rotate right', symbol: '↷', x: Math.PI / 8, y: 0 },
  { label: 'Rotate up', symbol: '↑', x: 0, y: -Math.PI / 8 },
  { label: 'Rotate down', symbol: '↓', x: 0, y: Math.PI / 8 },
]
interface Props {
  values: Record<string, Value>
  color: (value: Value) => string
  theme: 'dark' | 'light'
  narrow: boolean
  openList: () => void
}

export default function BodyViewport({ values, color, theme, narrow, openList }: Props) {
  const selectedId = useExplorer(s => s.selection.selectedOrgan)
  const selected = organs.find(o => o.id === selectedId)
  const layers = useExplorer(s => s.layers)
  const isolate = useExplorer(s => s.isolate)
  const toggleIsolate = useExplorer(s => s.toggleIsolate)
  const apiRef = useRef<SceneApi | null>(null)
  const [ready, setReady] = useState(false)
  const [model, setModel] = useState('Loading anatomy…')
  const onApi = useCallback((api: SceneApi | null) => {
    apiRef.current = api
    setReady(Boolean(api))
  }, [])
  const canFocus = selected?.modeled && layers[selected.layer as Layer]

  return <div className="body-stage">
    <div className="stage-heading">
      <span className="eyebrow">Anatomy explorer</span>
      <span className="stage-model">{model}</span>
    </div>
    <Boundary fallback={<div className="canvas-fallback">The anatomy view could not load. Use the organ list to explore.</div>}>
      <Suspense fallback={<div className="canvas-fallback">Loading the anatomy view…</div>}>
        <BodyScene values={values} color={color} theme={theme} onApi={onApi} onModel={setModel} />
      </Suspense>
    </Boundary>
    <div className="view-controls" aria-label="View controls">
      {rotations.map(({ label, symbol, x, y }) => <button
        key={label} title={label} aria-label={label} disabled={!ready}
        onClick={() => apiRef.current?.rotate(x, y)}
      >{symbol}</button>)}
      <button title="Zoom in" aria-label="Zoom in" disabled={!ready} onClick={() => apiRef.current?.zoom(.25)}>+</button>
      <button title="Zoom out" aria-label="Zoom out" disabled={!ready} onClick={() => apiRef.current?.zoom(-.25)}>−</button>
    </div>
    <div className="body-actions">
      {narrow && <button className="primary-button" onClick={openList}>Organ list</button>}
      <button disabled={!canFocus || !ready} onClick={() => apiRef.current?.focus()}>⌖ Focus</button>
      <button aria-pressed={isolate} disabled={!selected?.modeled} onClick={toggleIsolate}>◈ Isolate</button>
      <button disabled={!ready} onClick={() => apiRef.current?.reset()}>Reset view</button>
    </div>
    <p className="stage-hint">Drag to rotate · Scroll to zoom · Select an organ</p>
  </div>
}
