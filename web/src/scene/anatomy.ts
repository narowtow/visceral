import { Box3, Group, Mesh, MeshStandardMaterial, Object3D } from 'three'
import { organs } from '../data/contract'
import type { Layer, Organ } from '../data/contract'
import type { Value } from '../data/contract'

export const isMesh = (node: Object3D): node is Mesh => (node as Mesh).isMesh === true
const noPicking = () => false

export function presentationFor(organ: Organ, layers: Record<Layer, boolean>, isolate: boolean, selected: string | null) {
  const selectedOrgan = organs.find(o => o.id === selected)
  const isolatedId = isolate && selectedOrgan?.modeled ? selected : null
  const visible = Boolean(layers[organ.layer as Layer]) && (!isolatedId || organ.id === isolatedId)
  const organsVisible = layers.organs && (!isolatedId || selectedOrgan?.layer === 'organs')
  return { visible, pickable: visible && !(organsVisible && (organ.layer === 'skin' || organ.layer === 'skeleton')) }
}

/** Names may identify a mesh or a named group of meshes in an imported GLB. */
export function indexAnatomy(root: Object3D): Map<string, Mesh[]> {
  const result = new Map<string, Mesh[]>()
  const names = new Map(organs.flatMap(organ => organ.meshNames.map(name => [name, organ.id] as const)))
  root.traverse(node => {
    const id = names.get(node.name)
    if (!id) return
    const meshes = result.get(id) ?? []
    node.traverse(child => { if (isMesh(child) && !meshes.includes(child)) meshes.push(child) })
    result.set(id, meshes)
  })
  return result
}
export function prepareAnatomy(source: Object3D) {
  const root = source.clone(true)
  const index = indexAnatomy(root)
  for (const [id, meshes] of index) for (const mesh of meshes) {
    mesh.userData.organId = id
    // Cached GLTF materials must never be mutated across instances or organs.
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(m => m.clone()) : mesh.material.clone()
  }
  root.updateMatrixWorld(true)
  return { root, index }
}
export function validateModelRoot(root: Object3D) {
  const missing = organs.filter(o => o.modeled).flatMap(o => o.meshNames).filter(name => {
    const node = root.getObjectByName(name)
    let nonempty = false
    node?.traverse(child => { if (isMesh(child) && child.geometry.getAttribute('position')?.count > 0) nonempty = true })
    return !nonempty
  })
  if (missing.length) throw new Error(`Anatomy model has missing or empty meshes: ${missing.join(', ')}`)
  return root
}
export function organBounds(meshes: Mesh[]) {
  const bounds = new Box3()
  for (const mesh of meshes) bounds.union(new Box3().setFromObject(mesh))
  return bounds
}
export function disposeMaterials(root: Group | Object3D) {
  root.traverse(node => { if (isMesh(node)) for (const material of Array.isArray(node.material) ? node.material : [node.material]) material.dispose() })
}
/** Shared by the scene and the compressed-model regression test. */
export function updateAnatomy(
  index: Map<string, Mesh[]>, values: Record<string, Value>, color: (value: Value) => string,
  layers: Record<Layer, boolean>, isolate: boolean, selected: string | null,
  theme: 'dark' | 'light' = 'dark',
) {
  for (const organ of organs) for (const mesh of index.get(organ.id) ?? []) {
    const presentation = presentationFor(organ, layers, isolate, selected)
    mesh.visible = presentation.visible
    mesh.raycast = presentation.pickable ? Mesh.prototype.raycast : noPicking
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const standard = material as MeshStandardMaterial
      if (!standard.isMeshStandardMaterial) continue
      const shell = organ.layer === 'skin'
      const bone = organ.layer === 'skeleton'
      const alone = layers[organ.layer as Layer] && Object.entries(layers).every(([layer, visible]) => layer === organ.layer || !visible)
      const showData = (!shell && !bone) || selected === organ.id || alone
      standard.color.set(showData ? color(values[organ.id] ?? null) : shell ? '#b8c9d4' : '#c8c2b2')
      standard.transparent = shell
      standard.opacity = shell ? (showData ? .22 : theme === 'dark' ? .035 : .055) : 1
      standard.depthWrite = !shell
      standard.roughness = shell ? .25 : .45
      standard.metalness = 0
      standard.emissive.set('#000000')
      standard.needsUpdate = true
    }
    mesh.renderOrder = organ.layer === 'skin' ? 2 : 0
  }
}
export const baseMaterial = () => new MeshStandardMaterial({ color: '#4aa3b5', roughness: 0.45, metalness: 0.08 })
