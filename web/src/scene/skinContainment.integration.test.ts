// @vitest-environment node
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { Box3, Mesh, Object3D, Triangle, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { organs } from '../data/contract'
import { configureModelLoader } from './modelLoader'
import { validateModelRoot } from './anatomy'

let root: Object3D
let skinPoints: Vector3[]
let skinBounds: Box3
function worldPoints(mesh: Mesh) {
  const positions = mesh.geometry.getAttribute('position')
  return Array.from({ length: positions.count }, (_, i) => new Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld))
}
function skinBand(bounds: Box3, halfWidth = .2) {
  const center = bounds.getCenter(new Vector3())
  const points = skinPoints.filter(point => point.y >= bounds.min.y && point.y <= bounds.max.y && Math.abs(point.x - center.x) < halfWidth)
  expect(points.length, 'Skin slice must contain vertices; do not silently skip containment').toBeGreaterThan(2)
  return new Box3().setFromPoints(points)
}

beforeAll(async () => {
  const bytes = readFileSync('public/models/visceral.glb')
  const gltf = await configureModelLoader(new GLTFLoader()).parseAsync(Uint8Array.from(bytes).buffer, '')
  root = validateModelRoot(gltf.scene)
  root.updateMatrixWorld(true)
  skinPoints = worldPoints(root.getObjectByName('skin') as Mesh)
  skinBounds = new Box3().setFromPoints(skinPoints)
})

describe('shipped organs remain within their local skin height band', () => {
  const names = organs.filter(organ => organ.modeled).flatMap(organ => organ.meshNames).filter(name => !['skin', 'skeleton'].includes(name))
  it.each(names)('%s fits its skin slice', name => {
    const bounds = new Box3().setFromObject(root.getObjectByName(name)!)
    const slice = skinBand(bounds)
    // External pinnae are surface structures and extend ~7 mm beyond this
    // decimated skin shell. Internal organs keep the tighter 3 mm tolerance.
    const tolerance = name.startsWith('ear_') ? .008 : .003
    for (const axis of ['x', 'z'] as const) {
      expect(bounds.min[axis], `${name}: posterior/left ${axis}`).toBeGreaterThanOrEqual(slice.min[axis] - tolerance)
      expect(bounds.max[axis], `${name}: anterior/right ${axis}`).toBeLessThanOrEqual(slice.max[axis] + tolerance)
    }
    expect(bounds.min.y).toBeGreaterThanOrEqual(skinBounds.min.y - tolerance)
    expect(bounds.max.y).toBeLessThanOrEqual(skinBounds.max.y + tolerance)
  })

  it('keeps the entire stylized thyroid at least 3 mm inside the neck envelope', () => {
    const bounds = new Box3().setFromObject(root.getObjectByName('thyroid')!)
    const neck = skinBand(bounds, .035)
    for (const axis of ['x', 'z'] as const) {
      expect(bounds.min[axis], `Thyroid ${axis}: ${bounds.min[axis]} vs neck ${neck.min[axis]}`).toBeGreaterThanOrEqual(neck.min[axis] + .003)
      expect(bounds.max[axis], `Thyroid ${axis}: ${bounds.max[axis]} vs neck ${neck.max[axis]}`).toBeLessThanOrEqual(neck.max[axis] - .003)
    }
  })

  it('retains at least 3 mm surface clearance after Meshopt quantization', () => {
    const thyroid = root.getObjectByName('thyroid') as Mesh
    const search = new Box3().setFromObject(thyroid).expandByScalar(.02)
    const indices = (root.getObjectByName('skin') as Mesh).geometry.index!
    const triangles: Triangle[] = []
    for (let i = 0; i < indices.count; i += 3) {
      const vertices = [0, 1, 2].map(offset => skinPoints[indices.getX(i + offset)])
      // Every triangle capable of breaking a 3 mm margin intersects this box.
      if (new Box3().setFromPoints(vertices).intersectsBox(search)) {
        triangles.push(new Triangle(vertices[0], vertices[1], vertices[2]))
      }
    }
    expect(triangles.length).toBeGreaterThan(0)
    const closest = new Vector3()
    let clearance = Infinity
    for (const point of worldPoints(thyroid)) for (const triangle of triangles) {
      clearance = Math.min(clearance, triangle.closestPointToPoint(point, closest).distanceTo(point))
    }
    expect(clearance).toBeGreaterThanOrEqual(.003)
  })
})
