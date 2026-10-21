import { Box3, Vector3 } from 'three'

/** Front view that fits both model dimensions, including a depth allowance. */
export function cameraFrame(bounds: Box3, verticalFov: number, aspect: number) {
  if (bounds.isEmpty() || !Number.isFinite(aspect) || aspect <= 0 || verticalFov <= 0 || verticalFov >= 180) {
    throw new Error('Cannot frame empty anatomy or an invalid viewport.')
  }
  const center = bounds.getCenter(new Vector3())
  const size = bounds.getSize(new Vector3())
  const tangent = Math.tan(verticalFov * Math.PI / 360)
  const distance = Math.max(size.y / 2 / tangent, size.x / 2 / (tangent * aspect), .1) * 1.2 + size.z / 2
  return { center, position: center.clone().add(new Vector3(0, 0, distance)), distance }
}

export const outlineColor = (theme: 'dark' | 'light') => theme === 'dark' ? '#c4dce8' : '#193d53'
