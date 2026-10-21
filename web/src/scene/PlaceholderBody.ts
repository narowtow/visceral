import { CapsuleGeometry, Group, Mesh, SphereGeometry } from 'three'
import { baseMaterial } from './anatomy'

type Point = [number, number, number]
/** Y-up, metres, front +Z; intentionally schematic rather than diagnostic anatomy. */
export function PlaceholderBody(): Group {
  const body = new Group()
  body.name = 'PlaceholderBody'
  const ellipsoid = (name: string, position: Point, scale: Point, parent = body) => {
    const mesh = new Mesh(new SphereGeometry(1, 28, 20), baseMaterial())
    mesh.name = name; mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh)
    return mesh
  }
  const capsule = (name: string, position: Point, radius: number, length: number, parent: Group, angle = 0) => {
    const mesh = new Mesh(new CapsuleGeometry(radius, length, 6, 16), baseMaterial())
    mesh.name = name; mesh.position.set(...position); mesh.rotation.z = angle; parent.add(mesh)
    return mesh
  }
  const skin = new Group(); skin.name = 'skin'; body.add(skin)
  ellipsoid('shell_torso', [0, 1.18, 0], [.225, .35, .125], skin)
  ellipsoid('shell_pelvis', [0, .87, 0], [.18, .15, .12], skin)
  ellipsoid('shell_head', [0, 1.635, 0], [.105, .115, .095], skin)
  capsule('shell_neck', [0, 1.49, 0], .048, .08, skin)
  for (const side of [-1, 1]) {
    capsule('shell_arm', [side * .285, 1.16, 0], .048, .46, skin, side * .15)
    ellipsoid('shell_hand', [side * .33, .86, .01], [.04, .07, .025], skin)
    capsule('shell_leg', [side * .1, .45, 0], .075, .6, skin)
    ellipsoid('shell_foot', [side * .1, .075, .04], [.06, .045, .115], skin)
  }
  const skeleton = new Group(); skeleton.name = 'skeleton'; body.add(skeleton)
  capsule('spine', [0, 1.18, -.065], .016, .52, skeleton)
  for (let i = 0; i < 7; i++) ellipsoid('rib', [0, 1.18 + i * .034, -.02], [.17 - i * .009, .008, .06], skeleton)
  ellipsoid('skull', [0, 1.635, -.01], [.092, .102, .085], skeleton)
  for (const side of [-1, 1]) {
    capsule('leg_bone', [side * .1, .45, 0], .022, .62, skeleton)
    capsule('arm_bone', [side * .285, 1.16, 0], .013, .49, skeleton, side * .15)
  }
  const specs: [string, Point, Point][] = [
    ['brain', [0, 1.665, .018], [.085, .07, .075]],
    ['eye_left', [.042, 1.625, .085], [.018, .015, .015]], ['eye_right', [-.042, 1.625, .085], [.018, .015, .015]],
    ['ear_left', [.105, 1.625, 0], [.015, .028, .015]], ['ear_right', [-.105, 1.625, 0], [.015, .028, .015]],
    ['thyroid', [0, 1.46, .045], [.035, .025, .018]], ['trachea', [0, 1.4, .015], [.016, .065, .016]],
    ['lung_left', [.097, 1.305, .01], [.07, .13, .07]], ['lung_right', [-.097, 1.305, .01], [.07, .13, .07]],
    ['heart', [.025, 1.265, .085], [.052, .072, .045]], ['esophagus', [0, 1.305, -.07], [.013, .14, .012]],
    ['liver', [-.078, 1.125, .025], [.105, .06, .073]], ['stomach', [.09, 1.105, .04], [.057, .068, .048]],
    ['gallbladder', [-.08, 1.077, .07], [.018, .026, .018]], ['pancreas', [.018, 1.045, .025], [.075, .02, .025]],
    ['small_intestine', [0, .952, .045], [.105, .07, .055]],
    ['colon', [0, .98, .01], [.14, .105, .038]], ['rectum', [0, .87, .01], [.021, .045, .025]],
    ['kidney_left', [.107, 1.08, -.065], [.032, .05, .025]], ['kidney_right', [-.107, 1.08, -.065], [.032, .05, .025]],
    ['bladder', [0, .84, .055], [.041, .04, .035]], ['prostate', [0, .792, .045], [.023, .018, .022]],
    ['testis_left', [.025, .755, .04], [.016, .023, .017]], ['testis_right', [-.025, .755, .04], [.016, .023, .017]],
  ]
  for (const [name, position, scale] of specs) ellipsoid(name, position, scale)
  // A hollow outer bowel silhouette leaves the inner intestinal placeholder visible.
  const colon = body.getObjectByName('colon') as Mesh
  body.remove(colon); colon.geometry.dispose()
  for (const material of Array.isArray(colon.material) ? colon.material : [colon.material]) material.dispose()
  const colonGroup = new Group(); colonGroup.name = 'colon'; body.add(colonGroup)
  capsule('colon_left', [-.125, .975, .07], .018, .13, colonGroup)
  capsule('colon_right', [.125, .975, .07], .018, .13, colonGroup)
  const transverse = capsule('colon_top', [0, 1.055, .07], .018, .22, colonGroup)
  transverse.rotation.z = Math.PI / 2
  return body
}
