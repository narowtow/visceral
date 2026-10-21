import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { CameraControls, CameraControlsImpl, Outlines, useGLTF } from '@react-three/drei'
import { Mesh, MeshStandardMaterial, Object3D } from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { organs } from '../data/contract'
import type { Layer, Value } from '../data/contract'
import { useExplorer } from '../state/store'
import { formatValue } from '../lib/format'
import { disposeMaterials, organBounds, prepareAnatomy, presentationFor } from './anatomy'
import { PlaceholderBody } from './PlaceholderBody'
import { tappedOrgan } from './picking'
import type { PointerStart } from './picking'
import Boundary from '../components/Boundary'

export interface SceneApi { rotate: (x: number, y: number) => void; zoom: (amount: number) => void; reset: () => void; focus: () => void }
interface Props {
  values: Record<string, Value>; color: (v: Value) => string; theme: 'light' | 'dark'
  onApi: (api: SceneApi | null) => void; onModel: (model: string) => void
}
const MODEL_URL = `${import.meta.env.BASE_URL}models/visceral.glb`
const noPicking = () => {}
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Anatomy({ root: source, values, color, theme, onApi }: Props & { root: Object3D }) {
  const { root, index } = useMemo(() => prepareAnatomy(source), [source])
  const controls = useRef<CameraControls>(null)
  const tooltip = useRef<HTMLDivElement | null>(null)
  const { invalidate, gl } = useThree()
  const canvas = useRef(gl.domElement)
  const hovered = useRef<Mesh[]>([])
  const selected = useExplorer(s => s.selection.selectedOrgan)
  const selectOrgan = useExplorer(s => s.selectOrgan)
  const layers = useExplorer(s => s.layers)
  const isolate = useExplorer(s => s.isolate)
  const down = useRef<PointerStart | null>(null)
  useLayoutEffect(() => { void controls.current?.setLookAt(0, 1, 3.05, 0, .9, 0, false) }, [])
  useEffect(() => () => disposeMaterials(root), [root])
  useEffect(() => {
    const element = canvas.current
    tooltip.current = element.parentElement?.querySelector('.body-tooltip') ?? null
    return () => { element.style.cursor = '' }
  }, [gl])
  useLayoutEffect(() => {
    for (const organ of organs) for (const mesh of index.get(organ.id) ?? []) {
      const presentation = presentationFor(organ, layers, isolate, selected)
      mesh.visible = presentation.visible
      mesh.raycast = presentation.pickable ? Mesh.prototype.raycast : noPicking
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if (material instanceof MeshStandardMaterial) {
          material.color.set(color(values[organ.id] ?? null))
          const shell = organ.layer === 'skin'
          material.transparent = shell
          material.opacity = shell ? .12 : 1
          material.depthWrite = !shell
          material.roughness = .45
          material.emissive.set('#000000')
          material.needsUpdate = true
        }
      }
      mesh.renderOrder = organ.layer === 'skin' ? 2 : 0
    }
    root.updateMatrixWorld(true)
    invalidate()
  }, [root, index, layers, isolate, selected, values, color, invalidate])
  useEffect(() => {
    const animated = () => !reducedMotion()
    const api: SceneApi = {
      rotate: (x, y) => { void controls.current?.rotate(x, y, animated()) },
      zoom: amount => { void controls.current?.dolly(amount, animated()) },
      reset: () => { void controls.current?.setLookAt(0, 1, 3.05, 0, .9, 0, animated()) },
      focus: () => {
        const meshes = selected ? index.get(selected) : undefined
        if (!meshes?.length) return
        root.updateMatrixWorld(true)
        void controls.current?.fitToBox(organBounds(meshes), animated(), { paddingLeft: .15, paddingRight: .15, paddingTop: .15, paddingBottom: .15 })
      },
    }
    onApi(api)
    return () => onApi(null)
  }, [selected, root, index, onApi])
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
      tooltip.current.textContent = `${organs.find(o => o.id === id)?.label} · ${formatValue(values[id] ?? null)}`
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
        if (id) { e.stopPropagation(); selectOrgan(id) }
      }} onPointerCancel={() => { down.current = null }} />
    {(selected && selectedLayer && layers[selectedLayer] ? index.get(selected) ?? [] : []).map(mesh => <mesh key={mesh.uuid} geometry={mesh.geometry} matrix={mesh.matrixWorld} matrixAutoUpdate={false} raycast={noPicking}>
      <meshBasicMaterial transparent opacity={0} depthWrite={false} /><Outlines thickness={2.5} color={theme === 'dark' ? '#ffffff' : '#071525'} />
    </mesh>)}
    <CameraControls ref={controls} makeDefault minDistance={.25} maxDistance={5}
      mouseButtons={{ left: CameraControlsImpl.ACTION.ROTATE, right: CameraControlsImpl.ACTION.NONE, middle: CameraControlsImpl.ACTION.DOLLY, wheel: CameraControlsImpl.ACTION.DOLLY }}
      touches={{ one: CameraControlsImpl.ACTION.TOUCH_ROTATE, two: CameraControlsImpl.ACTION.TOUCH_DOLLY, three: CameraControlsImpl.ACTION.NONE }}
      onChange={() => invalidate()} onStart={() => { if (tooltip.current) tooltip.current.hidden = true }} />
  </>
}
function GlbBody(props: Props) {
  const gltf = useGLTF(MODEL_URL, false, false, loader => loader.setMeshoptDecoder(MeshoptDecoder))
  const { onModel } = props
  useEffect(() => { onModel('BodyParts3D anatomy') }, [onModel])
  return <Anatomy {...props} root={gltf.scene} />
}
function Model(props: Props) {
  const root = useMemo(() => PlaceholderBody(), [])
  const { onModel } = props
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    // Vite may return index.html for a missing asset; require a binary GLB response.
    if (import.meta.env.VITE_ANATOMY !== 'placeholder') fetch(MODEL_URL, { method: 'HEAD', signal: controller.signal }).then(response => {
      if (response.ok && !response.headers.get('content-type')?.includes('text/html')) setAvailable(true)
    }).catch(() => {})
    onModel('Schematic placeholder anatomy')
    return () => controller.abort()
  }, [onModel])
  const placeholder = <Anatomy {...props} root={root} />
  return available ? <Boundary fallback={placeholder}><Suspense fallback={placeholder}><GlbBody {...props} /></Suspense></Boundary> : placeholder
}
export default function BodyScene(props: Props) {
  return <Boundary fallback={<div className="canvas-fallback"><p>The 3D view is unavailable on this device.</p><p>Explore every group using the organ list and charts.</p></div>}>
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={{ position: [0, 1, 3.05], fov: 38, near: .01, far: 30 }} gl={{ antialias: true, alpha: true }} aria-label="Interactive schematic body. Use the organ list and view buttons for keyboard access.">
      <Model {...props} />
    </Canvas>
    <div className="body-tooltip" hidden aria-hidden="true" />
  </Boundary>
}
