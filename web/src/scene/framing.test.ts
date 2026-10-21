import { Box3, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { cameraFrame, outlineColor } from './framing'

describe('model camera framing', () => {
  const bounds = new Box3(new Vector3(-.4, 0, -.2), new Vector3(.4, 1.75, .2))
  it('centers on real bounds and includes depth when fitting a front view', () => {
    const frame = cameraFrame(bounds, 38, 1)
    expect(frame.center.toArray()).toEqual([0, .875, 0])
    expect(frame.position.x).toBe(0)
    expect(frame.position.y).toBe(.875)
    expect((frame.distance - .2) * Math.tan(19 * Math.PI / 180)).toBeGreaterThan(.875)
  })
  it('increases distance for narrow viewports instead of clipping the sides', () => {
    expect(cameraFrame(bounds, 38, .25).distance).toBeGreaterThan(cameraFrame(bounds, 38, 1).distance)
  })
  it('handles translated and scaled anatomy without hard-coded body heights', () => {
    const translated = bounds.clone().translate(new Vector3(2, 4, -3))
    expect(cameraFrame(translated, 38, 1).center.toArray()).toEqual([2, 4.875, -3])
    expect(() => cameraFrame(new Box3(), 38, 1)).toThrow(/empty/)
    expect(() => cameraFrame(bounds, 38, 0)).toThrow(/viewport/)
  })
  it('uses restrained contrasting selection colors in both themes', () => {
    expect(outlineColor('dark')).toBe('#c4dce8')
    expect(outlineColor('light')).toBe('#193d53')
  })
})
