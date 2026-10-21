import { Box3, Group, Mesh, MeshStandardMaterial, Object3D } from 'three'
import { organs } from '../data/contract'
import type { Layer, Organ } from '../data/contract'

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
    node.traverse(child => { if (child instanceof Mesh && !meshes.includes(child)) meshes.push(child) })
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
  return { root, index }
}
export function organBounds(meshes: Mesh[]) {
  const bounds = new Box3()
  for (const mesh of meshes) bounds.union(new Box3().setFromObject(mesh))
  return bounds
}
export function disposeMaterials(root: Group | Object3D) {
  root.traverse(node => { if (node instanceof Mesh) for (const material of Array.isArray(node.material) ? node.material : [node.material]) material.dispose() })
}
export const baseMaterial = () => new MeshStandardMaterial({ color: '#4aa3b5', roughness: 0.45, metalness: 0.08 })
