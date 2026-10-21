import { describe, expect, it } from 'vitest'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D } from 'three'
import { organs } from '../data/contract'
import { indexAnatomy, organBounds, prepareAnatomy, presentationFor, updateAnatomy, validateModelRoot } from './anatomy'
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
    expect(validateModelRoot(root)).toBe(root)
    for (const organ of organs) for (const name of organ.meshNames) expect(root.getObjectByName(name), name).toBeDefined()
    for (const organ of organs) expect(index.has(organ.id)).toBe(organ.modeled)
  })
  it('initializes nested mesh transforms before the first render (no unit-sphere outline)', () => {
    const source = new Group(), parent = new Group()
    parent.position.set(0, 1.2, .1)
    const heart = new Mesh(new BoxGeometry(), new MeshStandardMaterial())
    heart.name = 'heart'; heart.scale.set(.05, .07, .04)
    parent.add(heart); source.add(parent)
    const prepared = prepareAnatomy(source), mesh = prepared.index.get('heart')![0]
    expect(mesh.matrixWorld.elements[0]).toBe(.05)
    expect(mesh.matrixWorld.elements[13]).toBe(1.2)
    expect(mesh.matrixWorld.elements[14]).toBe(.1)
    expect(() => validateModelRoot(source)).toThrow(/missing or empty/)
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
  it.each(['dark', 'light'] as const)('keeps outer layers neutral in %s and restores data on selection or layer-only views', theme => {
    const source = PlaceholderBody(), { index } = prepareAnatomy(source)
    const skin = index.get('skin')![0], bone = index.get('bones_joints')![0], heart = index.get('heart')![0]
    const material = (mesh: Mesh) => mesh.material as MeshStandardMaterial
    const color = () => '#ffff00'
    const layers = { skin: true, skeleton: true, organs: true }
    updateAnatomy(index, {}, color, layers, false, 'heart', theme)
    expect(material(skin).color.getHexString()).toBe('b8c9d4')
    expect(material(skin).opacity).toBe(theme === 'dark' ? .035 : .055)
    expect(material(skin).depthWrite).toBe(false)
    expect(material(bone).color.getHexString()).toBe('c8c2b2')
    expect(material(heart).color.getHexString()).toBe('ffff00')
    updateAnatomy(index, {}, color, layers, false, 'skin', theme)
    expect(material(skin).color.getHexString()).toBe('ffff00')
    expect(material(skin).opacity).toBe(.22)
    updateAnatomy(index, {}, color, layers, false, 'bones_joints', theme)
    expect(material(bone).color.getHexString()).toBe('ffff00')
    expect(material(skin).color.getHexString()).toBe('b8c9d4')
    updateAnatomy(index, {}, color, { skin: true, skeleton: false, organs: false }, false, null, theme)
    expect(material(skin).color.getHexString()).toBe('ffff00')
    updateAnatomy(index, {}, color, { skin: false, skeleton: true, organs: false }, false, null, theme)
    expect(material(bone).color.getHexString()).toBe('ffff00')
    expect(skin.visible).toBe(false)
    expect(material(indexAnatomy(source).get('skin')![0]).opacity).toBe(1)
  })
})
