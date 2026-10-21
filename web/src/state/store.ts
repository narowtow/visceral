import { create } from 'zustand'
import type { Layer, Manifest, Selection } from '../data/contract'
import { organs } from '../data/contract'
import { defaults, normalizeSelection, parseHash, routeFromHash, serializeHash } from './url'
export type Theme = 'system' | 'dark' | 'light'
interface ExplorerState {
  selection: Selection; layers: Record<Layer, boolean>; isolate: boolean; theme: Theme; rescale: boolean
  setFilters: (patch: Partial<Selection>, manifest: Manifest) => void
  selectOrgan: (id: string | null) => void
  toggleLayer: (layer: Layer) => void
  toggleIsolate: () => void; setTheme: (theme: Theme) => void; toggleRescale: () => void
}
export const useExplorer = create<ExplorerState>(set => ({
  selection: defaults, layers: { skin: true, skeleton: false, organs: true }, isolate: false, theme: 'system', rescale: false,
  setFilters: (patch, manifest) => set(state => ({ selection: normalizeSelection({ ...state.selection, ...patch }, manifest) })),
  selectOrgan: id => set(state => ({
    selection: { ...state.selection, selectedOrgan: id },
    isolate: state.isolate && organs.some(organ => organ.id === id && organ.modeled),
  })),
  toggleLayer: layer => set(state => ({ layers: { ...state.layers, [layer]: !state.layers[layer] } })),
  toggleIsolate: () => set(state => ({ isolate: !state.isolate })),
  setTheme: theme => set({ theme }), toggleRescale: () => set(state => ({ rescale: !state.rescale })),
}))
export function syncUrl(manifest: Manifest) {
  const read = () => {
    const selection = parseHash(window.location.hash, manifest)
    useExplorer.setState(state => ({ selection, isolate: state.isolate && organs.some(o => o.id === selection.selectedOrgan && o.modeled) }))
  }
  read()
  const write = () => {
    const hash = serializeHash(useExplorer.getState().selection, routeFromHash(window.location.hash))
    if (hash !== window.location.hash) window.history.replaceState(null, '', hash)
  }
  write()
  const unsubscribe = useExplorer.subscribe((state, previous) => { if (state.selection !== previous.selection) write() })
  window.addEventListener('hashchange', read)
  return () => { unsubscribe(); window.removeEventListener('hashchange', read) }
}
