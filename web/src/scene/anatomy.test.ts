import { describe, expect, it } from 'vitest'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D } from 'three'
import { organs } from '../data/contract'
import { indexAnatomy, organBounds, prepareAnatomy, presentationFor } from './anatomy'
import { PlaceholderBody } from './PlaceholderBody'
describe('mesh-name anatomy adapter', () => {
  it('indexes both kidneys, grouped meshes and unknown names safely', () => {
    const root = new Object3D()
    const left = new Mesh(); left.name = 'kidney_left'
    const right = new Mesh(); right.name = 'kidney_right'
    const heart = new Group(); heart.name = 'heart'; heart.add(new Mesh(), new Mesh())
    const ignored = new Mesh(); ignored.name = 'unmapped'
    root.add(left, right, heart, ignored)
    const index = indexAnatomy(root)
    expect(index.get('kidneys')).toEqual([left, right])
    expect(index.get('heart')).toHaveLength(2)
    expect(index.size).toBe(2)
    expect(index.has('blood_immune')).toBe(false)
  })
  it('clones materials per mesh without changing the source and computes union bounds', () => {
    const root = new Group(), shared = new MeshStandardMaterial()
    for (const [name, x] of [['kidney_left', -1], ['kidney_right', 1]] as const) {
      const mesh = new Mesh(new BoxGeometry(1, 1, 1), shared); mesh.name = name; mesh.position.x = x; root.add(mesh)
    }
    const prepared = prepareAnatomy(root), kidneys = prepared.index.get('kidneys')!
    expect(kidneys[0].material).not.toBe(kidneys[1].material)
    expect(kidneys[0].material).not.toBe(shared)
    expect(kidneys[0].userData.organId).toBe('kidneys')
    expect(root.children[0].userData.organId).toBeUndefined()
    const bounds = organBounds(kidneys)
    expect(bounds.min.x).toBe(-1.5); expect(bounds.max.x).toBe(1.5)
  })
  it('supplies every modeled contract mesh and no systemic anatomy', () => {
    const root = PlaceholderBody(), index = indexAnatomy(root)
    for (const organ of organs) for (const name of organ.meshNames) expect(root.getObjectByName(name), name).toBeDefined()
    for (const organ of organs) expect(index.has(organ.id)).toBe(organ.modeled)
  })
  it('excludes hidden meshes and outer layers from picking while organs are visible', () => {
    const skin = organs.find(o => o.id === 'skin')!, heart = organs.find(o => o.id === 'heart')!
    const layers = { skin: true, skeleton: true, organs: true }
    expect(presentationFor(skin, layers, false, 'heart')).toEqual({ visible: true, pickable: false })
    expect(presentationFor(heart, layers, false, 'heart')).toEqual({ visible: true, pickable: true })
    expect(presentationFor(heart, { ...layers, organs: false }, false, 'heart')).toEqual({ visible: false, pickable: false })
    expect(presentationFor(skin, layers, true, 'skin')).toEqual({ visible: true, pickable: true })
    expect(presentationFor(heart, layers, true, 'skin')).toEqual({ visible: false, pickable: false })
  })
})
