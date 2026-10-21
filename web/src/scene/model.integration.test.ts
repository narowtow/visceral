// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { Box3, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { toCreasedNormals } from 'three-stdlib'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { configureModelLoader } from './modelLoader'
import { describe, expect, it } from 'vitest'
import { organs } from '../data/contract'
import { indexAnatomy, prepareAnatomy, updateAnatomy, validateModelRoot } from './anatomy'
import { cameraFrame } from './framing'

describe('shipped Meshopt anatomy (without WebGL)', () => {
  it('decodes every contract node with correct metres, axes and provenance', async () => {
    const bytes = readFileSync('public/models/visceral.glb')
    const loader = configureModelLoader(new GLTFLoader())
    const gltf = await loader.parseAsync(Uint8Array.from(bytes).buffer, '')
    const source = validateModelRoot(gltf.scene)
    const { root } = prepareAnatomy(source)
    const index = indexAnatomy(root)
    const bounds = new Box3().setFromObject(root)
    expect(bounds.min.y).toBeCloseTo(0, 4)
    expect(bounds.max.y).toBeGreaterThan(1.7)
    expect(bounds.max.y).toBeLessThan(1.8)
    expect((bounds.min.x + bounds.max.x) / 2).toBeCloseTo(0, 4)
    expect((bounds.min.z + bounds.max.z) / 2).toBeCloseTo(0, 4)
    expect(cameraFrame(bounds, 38, 1).center.y).toBeCloseTo(bounds.max.y / 2, 4)
    let triangles = 0, meshes = 0
    root.traverse(node => {
      if (!(node instanceof Mesh)) return
      meshes++
      triangles += (node.geometry.index?.count ?? node.geometry.getAttribute('position').count) / 3
      expect(node.userData.organ_id).toBeTruthy()
      expect(node.userData).toHaveProperty('stylized')
      const original = source.getObjectByName(node.name) as Mesh
      expect(node.material).not.toBe(original.material)
      // This is the same CPU geometry preparation used by drei Outlines.
      const outline = toCreasedNormals(node.geometry, Math.PI)
      outline.computeBoundingBox()
      expect(outline.boundingBox!.min.toArray().every(Number.isFinite)).toBe(true)
      if (outline !== node.geometry) outline.dispose()
    })
    expect(meshes).toBe(organs.filter(o => o.modeled).flatMap(o => o.meshNames).length)
    expect(triangles).toBeGreaterThanOrEqual(150000)
    expect(triangles).toBeLessThanOrEqual(250000)
    expect(index.get('kidneys')).toHaveLength(2)
    expect(index.get('ears')).toHaveLength(2)
    const thyroid = index.get('thyroid')![0]
    expect(thyroid.userData.stylized).toBe(true)
    expect(JSON.parse(thyroid.userData.source_concepts)).toEqual([])
    const thyroidBounds = new Box3().setFromObject(thyroid)
    expect(thyroidBounds.getSize(new Vector3()).x).toBeGreaterThan(.04)
    expect(thyroidBounds.getSize(new Vector3()).x).toBeLessThan(.06)
    const airway = root.getObjectByName('trachea') as Mesh
    expect(JSON.parse(airway.userData.source_concepts)).toEqual(expect.arrayContaining(['FMA7394', 'FMA26661', 'FMA26662']))
    expect((airway.geometry.index?.count ?? 0) / 3).toBeLessThanOrEqual(8000)
    for (const name of ['lung_left', 'lung_right']) {
      const lung = root.getObjectByName(name) as Mesh
      expect(lung.userData.derived).toBe('envelope of BodyParts3D bronchial/vascular tree')
      expect((lung.geometry.index?.count ?? 0) / 3).toBeLessThanOrEqual(8000)
      expect((lung.geometry.index?.count ?? 0) / 3).toBeGreaterThanOrEqual(6000)
      const positions = lung.geometry.getAttribute('position'), indices = lung.geometry.index!
      const a = new Vector3(), b = new Vector3(), c = new Vector3()
      let signedVolume = 0
      for (let i = 0; i < indices.count; i += 3) {
        a.fromBufferAttribute(positions, indices.getX(i)).applyMatrix4(lung.matrixWorld)
        b.fromBufferAttribute(positions, indices.getX(i + 1)).applyMatrix4(lung.matrixWorld)
        c.fromBufferAttribute(positions, indices.getX(i + 2)).applyMatrix4(lung.matrixWorld)
        signedVolume += a.dot(b.cross(c)) / 6
      }
      const size = new Box3().setFromObject(lung).getSize(new Vector3())
      // An outer envelope fills its bounds; sparse vascular tubes do not.
      expect(Math.abs(signedVolume) / (size.x * size.y * size.z)).toBeGreaterThan(.3)
    }
    const rightEye = new Box3().setFromObject(root.getObjectByName('eye_right')!)
    const leftEye = new Box3().setFromObject(root.getObjectByName('eye_left')!)
    expect(rightEye.max.x).toBeLessThan(0)
    expect(leftEye.min.x).toBeGreaterThan(0)
    expect(leftEye.min.z).toBeGreaterThan(0)

    const skin = index.get('skin')![0]
    const skeleton = index.get('bones_joints')![0]
    expect((skeleton.geometry.index?.count ?? 0) / 3).toBeLessThanOrEqual(60000)
    for (const mesh of [skin, skeleton]) {
      const limbs = { leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0 }
      const positions = mesh.geometry.getAttribute('position')
      for (let i = 0; i < positions.count; i++) {
        const point = new Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld)
        if (point.y > .7 && point.y < 1.45 && point.x > .22) limbs.leftArm++
        if (point.y > .7 && point.y < 1.45 && point.x < -.22) limbs.rightArm++
        if (point.y < .65 && point.x > .03) limbs.leftLeg++
        if (point.y < .65 && point.x < -.03) limbs.rightLeg++
      }
      for (const [region, count] of Object.entries(limbs)) expect(count, `${mesh.name}: ${region}`).toBeGreaterThan(10)
      expect(new Box3().setFromObject(mesh).min.y).toBeLessThan(.08)
    }
    const layers = { skin: true, skeleton: false, organs: true }
    updateAnatomy(index, {}, () => '#336699', layers, false, 'heart')
    const skinMaterial = skin.material as MeshStandardMaterial
    expect(skinMaterial.transparent).toBe(true)
    expect(skinMaterial.opacity).toBe(.035)
    expect(skinMaterial.color.getHexString()).toBe('b8c9d4')
    expect(skinMaterial.depthWrite).toBe(false)
    expect(skin.visible).toBe(true)
    expect(skeleton.visible).toBe(false)
    updateAnatomy(index, {}, () => '#336699', { ...layers, skin: false, skeleton: true }, false, 'heart')
    expect(skin.visible).toBe(false)
    expect(skeleton.visible).toBe(true)
  })
})
