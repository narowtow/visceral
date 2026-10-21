/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { StrictMode, useCallback, useEffect, useState } from 'react'
import { createRoot, act, extend } from '@react-three/fiber'
import type { RootState } from '@react-three/fiber'
import { AmbientLight, DirectionalLight, Group } from 'three'
import type { Scene } from 'three'
import type { WebGLRenderer } from 'three'
import { expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { Model } from './BodyScene'
import type { SceneApi } from './BodyScene'
import { useExplorer } from '../state/store'
import type { CameraControls } from '@react-three/drei'

it('loads under StrictMode and moves the real camera from idle demand mode, including reduced motion', async () => {
  extend({ AmbientLight, DirectionalLight, Group })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const NativeRequest = globalThis.Request
  vi.stubGlobal('Request', class extends NativeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(typeof input === 'string' ? new URL(input, 'http://localhost') : input, init)
    }
  })
  const bytes = readFileSync('public/models/visceral.glb')
  const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 100))
    return new Response(Uint8Array.from(bytes), { headers: { 'Content-Type': 'model/gltf-binary' } })
  })
  const canvas = document.createElement('canvas')
  const gl = {
    domElement: canvas, render: vi.fn(), setPixelRatio: vi.fn(), setSize: vi.fn(),
    getDrawingBufferSize: (target: { set: (x: number, y: number) => unknown }) => target.set(600, 800),
    xr: { enabled: false, isPresenting: false, addEventListener: vi.fn(), removeEventListener: vi.fn() },
    shadowMap: {},
  } as unknown as WebGLRenderer
  const root = createRoot(canvas)
  let scene: Scene | undefined
  let state: RootState | undefined
  let api: SceneApi | null = null
  await root.configure({ gl, size: { width: 600, height: 800, top: 0, left: 0 }, dpr: 1, frameloop: 'demand', onCreated: created => { scene = created.scene; state = created } })
  const onModel = vi.fn()
  const onError = vi.fn()
  const previousSelection = useExplorer.getState().selection
  function Harness() {
    const [label, setLabel] = useState('Loading')
    const [, setReady] = useState(false)
    const onApi = useCallback((next: SceneApi | null) => { api = next; setReady(Boolean(next)) }, [])
    useEffect(() => { onModel(label) }, [label])
    return <Model values={{}} color={() => '#448899'} theme="dark" onApi={onApi} onModel={setLabel} onModelError={onError} />
  }
  try {
    await act(async () => { root.render(<StrictMode><Harness /></StrictMode>) })
    await waitFor(() => expect(onModel).toHaveBeenLastCalledWith('BodyParts3D anatomy'))
    expect(scene?.getObjectByName('PlaceholderBody')).toBeUndefined()
    expect(scene?.getObjectByName('heart')).toBeDefined()
    expect(onError).not.toHaveBeenCalled()
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect((fetcher.mock.calls[0][0] as Request).method).toBe('GET')
    await act(async () => { useExplorer.getState().selectOrgan('heart') })
    expect(api).not.toBeNull()
    const controls = state!.get().controls as CameraControls
    controls.smoothTime = .03
    const media = vi.spyOn(window, 'matchMedia')
    const idle = () => waitFor(() => expect(state!.get().internal.frames).toBe(0))
    for (const reduced of [true, false]) {
      media.mockReturnValue({ matches: reduced } as MediaQueryList)
      await idle()
      const before = state!.camera.position.clone()
      await act(async () => { api!.zoom(.25); api!.zoom(.25); api!.zoom(.25) })
      await waitFor(() => expect(state!.camera.position.distanceTo(before)).toBeGreaterThan(.6))
      await idle()
      const zoomed = state!.camera.position.clone()
      await act(async () => { api!.focus() })
      await waitFor(() => expect(state!.camera.position.distanceTo(zoomed)).toBeGreaterThan(.1))
      await idle()
      const focused = state!.camera.position.clone()
      await act(async () => { api!.rotate(Math.PI / 8, 0) })
      await waitFor(() => expect(state!.camera.position.distanceTo(focused)).toBeGreaterThan(.05))
      await idle()
      await act(async () => { api!.reset() })
      await waitFor(() => expect(state!.camera.position.distanceTo(before)).toBeLessThan(.01))
    }
  } finally {
    await act(async () => root.unmount())
    useExplorer.setState({ selection: previousSelection })
    vi.unstubAllGlobals()
  }
}, 10000)
