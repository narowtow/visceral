import { Fragment, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Canvas, createPortal, useThree, useLoader } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { CameraControls, CameraControlsImpl } from '@react-three/drei/core/CameraControls'
import { Outlines } from '@react-three/drei/core/Outlines'
import { Box3, Mesh, MeshStandardMaterial, Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MODEL_URL, configureModelLoader } from './modelLoader'
import { organs } from '../data/contract'
import type { Layer, Value } from '../data/contract'
import { useExplorer } from '../state/store'
import { formatBurden } from '../lib/format'
import { disposeMaterials, organBounds, prepareAnatomy, updateAnatomy, validateModelRoot } from './anatomy'
import { cameraFrame, outlineColor } from './framing'
import { PlaceholderBody } from './PlaceholderBody'
import { tappedOrgan } from './picking'
import type { PointerStart } from './picking'
import Boundary from '../components/Boundary'

export interface SceneApi { rotate: (x: number, y: number) => void; zoom: (amount: number) => void; reset: () => void; focus: () => void }
interface Props {
  values: Record<string, Value>; color: (v: Value) => string; theme: 'light' | 'dark'
  onApi: (api: SceneApi | null) => void; onModel: (model: string) => void
  onModelError?: (error: Error) => void
  onSelect?: (id: string) => void
  quiz?: boolean
}
// Three's raycaster stops descending when a decorative group's raycast returns false.
const noOutlinePicking = () => false
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const quizLayers = { skin: true, skeleton: false, organs: true }

function Anatomy({ root: source, values, color, theme, onApi, onSelect, quiz }: Props & { root: Object3D }) {
  const { root, index } = useMemo(() => prepareAnatomy(source), [source])
  const controls = useRef<CameraControls>(null)
  const tooltip = useRef<HTMLDivElement | null>(null)
  const { invalidate, gl, size } = useThree()
  const bounds = useMemo(() => new Box3().setFromObject(root), [root])
  const frame = useMemo(() => cameraFrame(bounds, 38, size.width / Math.max(1, size.height)), [bounds, size.width, size.height])
  const canvas = useRef(gl.domElement)
  const hovered = useRef<Mesh[]>([])
  const selected = useExplorer(s => s.selection.selectedOrgan)
  const selectOrgan = useExplorer(s => s.selectOrgan)
  const explorerLayers = useExplorer(s => s.layers)
  const explorerIsolate = useExplorer(s => s.isolate)
  const layers = quiz ? quizLayers : explorerLayers
  const isolate = !quiz && explorerIsolate
  const down = useRef<PointerStart | null>(null)
  useLayoutEffect(() => {
    const { position: p, center: c } = frame
    void controls.current?.setLookAt(p.x, p.y, p.z, c.x, c.y, c.z, false)
    invalidate()
  }, [frame, invalidate])
  useEffect(() => () => disposeMaterials(root), [root])
  useEffect(() => {
    const element = canvas.current
    tooltip.current = element.parentElement?.querySelector('.body-tooltip') ?? null
    return () => { element.style.cursor = '' }
  }, [gl])
  useLayoutEffect(() => {
    updateAnatomy(index, values, color, layers, isolate, selected, theme)
    root.updateMatrixWorld(true)
    invalidate()
  }, [root, index, layers, isolate, selected, values, color, theme, invalidate])
  useEffect(() => {
    const animated = () => !reducedMotion()
    const move = (command: (control: CameraControls) => unknown) => {
      if (!controls.current) return
      void command(controls.current)
      // Instant commands (reduced motion) emit no transitionstart event. Wake
      // the demand loop explicitly; drei's update events sustain animations.
      invalidate()
    }
    const api: SceneApi = {
      rotate: (x, y) => move(control => control.rotate(x, y, animated())),
      zoom: amount => move(control => control.dolly(amount, animated())),
      reset: () => {
        const { position: p, center: c } = frame
        move(control => control.setLookAt(p.x, p.y, p.z, c.x, c.y, c.z, animated()))
      },
      focus: () => {
        const meshes = selected ? index.get(selected) : undefined
        if (!meshes?.length) return
        root.updateMatrixWorld(true)
        move(control => control.fitToBox(organBounds(meshes), animated(), { paddingLeft: .15, paddingRight: .15, paddingTop: .15, paddingBottom: .15 }))
      },
    }
    onApi(api)
    return () => onApi(null)
  }, [selected, root, index, onApi, frame, invalidate])
  const pick = (e: ThreeEvent<PointerEvent>) => {
    const id = e.object.userData.organId as string | undefined
    if (!id) return
    e.stopPropagation()
    for (const mesh of hovered.current) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (m instanceof MeshStandardMaterial) m.emissive.set('#000000')
    }
    hovered.current = index.get(id) ?? []
    for (const mesh of hovered.current) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (m instanceof MeshStandardMaterial) { m.emissive.set('#18303b'); m.emissiveIntensity = .5 }
    }
    if (tooltip.current) {
      const stylized = hovered.current.some(mesh => mesh.userData.stylized) ? ' · Stylized anatomy' : ''
      // A quiz must not reveal the hovered organ's name before an answer.
      tooltip.current.textContent = quiz ? 'Select this structure' : `${organs.find(o => o.id === id)?.label} · ${formatBurden(values[id] ?? null)}${stylized}`
      tooltip.current.hidden = false
    }
    canvas.current.style.cursor = 'pointer'
    invalidate()
  }
  const leave = () => {
    if (tooltip.current) tooltip.current.hidden = true
    canvas.current.style.cursor = ''
    for (const mesh of hovered.current) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (m instanceof MeshStandardMaterial) m.emissive.set('#000000')
    }
    hovered.current = []
    invalidate()
  }
  const selectedLayer = organs.find(o => o.id === selected)?.layer as Layer | undefined
  return <>
    <ambientLight intensity={1.8} /><directionalLight position={[2, 3, 4]} intensity={3} /><directionalLight position={[-3, 2, -2]} intensity={2} color="#7fbcff" />
    <primitive object={root} onPointerOver={pick} onPointerMove={pick} onPointerOut={leave}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => { const id = e.object.userData.organId as string | undefined; if (id) { e.stopPropagation(); down.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, id } } }}
      onPointerUp={(e: ThreeEvent<PointerEvent>) => {
        const start = down.current; down.current = null
        const id = tappedOrgan(start, e.nativeEvent.clientX, e.nativeEvent.clientY, e.object.userData.organId)
        if (id) { e.stopPropagation(); (onSelect ?? selectOrgan)(id) }
      }} onPointerCancel={() => { down.current = null }} />
    {/* Attach to the real mesh: copying its not-yet-updated world matrix created
        a unit-sized outline at the origin (the reported white ellipse). */}
    {(selected && selectedLayer && layers[selectedLayer] ? index.get(selected) ?? [] : []).map(mesh => <Fragment key={mesh.uuid}>{createPortal(
      <Outlines thickness={1.5} color={outlineColor(theme)} raycast={noOutlinePicking} />,
      mesh,
    )}</Fragment>)}
    <CameraControls ref={controls} makeDefault minDistance={.06} maxDistance={Math.max(5, frame.distance * 3)}
      mouseButtons={{ left: CameraControlsImpl.ACTION.ROTATE, right: CameraControlsImpl.ACTION.NONE, middle: CameraControlsImpl.ACTION.DOLLY, wheel: CameraControlsImpl.ACTION.DOLLY }}
      touches={{ one: CameraControlsImpl.ACTION.TOUCH_ROTATE, two: CameraControlsImpl.ACTION.TOUCH_DOLLY, three: CameraControlsImpl.ACTION.NONE }}
      onChange={() => invalidate()} onStart={() => { if (tooltip.current) tooltip.current.hidden = true }} />
  </>
}
function GlbBody(props: Props) {
  const gltf = useLoader(GLTFLoader, MODEL_URL, configureModelLoader)
  const root = useMemo(() => validateModelRoot(gltf.scene), [gltf.scene])
  const { onModel } = props
  useEffect(() => { onModel('BodyParts3D anatomy') }, [onModel])
  return <Anatomy {...props} root={root} />
}
export function Model(props: Props) {
  const root = useMemo(() => PlaceholderBody(), [])
  const placeholder = <Schematic {...props} root={root} />
  if (import.meta.env.VITE_ANATOMY === 'placeholder') return placeholder
  // The loader cache handles StrictMode remounts. There is no separate HEAD
  // request, availability state, or parent effect that can reset the model label.
  return <Boundary onError={props.onModelError} fallback={placeholder}>
    <Suspense fallback={<Schematic {...props} root={root} loading />}><GlbBody {...props} /></Suspense>
  </Boundary>
}
function Schematic({ loading, ...props }: Props & { root: Object3D; loading?: boolean }) {
  const { onModel } = props
  useEffect(() => {
    onModel(loading ? 'Loading model · schematic preview' : 'Schematic placeholder anatomy')
  }, [loading, onModel])
  return <Anatomy {...props} />
}
export default function BodyScene(props: Props) {
  const [modelError, setModelError] = useState<string | null>(null)
  const onModelError = useCallback((error: Error) => setModelError(error.message), [])
  return <Boundary fallback={<div className="canvas-fallback"><p>The 3D view is unavailable on this device.</p><p>Explore every group using the organ list and charts.</p></div>}>
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 1, 3.05], fov: 38, near: .01, far: 30 }} gl={{ antialias: true, alpha: true }} aria-label="Interactive anatomy. Use the organ list and view buttons for keyboard access.">
      <Model {...props} onModelError={onModelError} />
    </Canvas>
    <div className="body-tooltip" hidden aria-hidden="true" />
    {modelError && <p className="model-notice" role="status" title={modelError}>3D model failed to load; showing schematic.</p>}
  </Boundary>
}
