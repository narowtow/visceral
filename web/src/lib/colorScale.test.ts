import { describe, expect, it } from 'vitest'
import { createColorScale, currentDomain, missingColors } from './colorScale'

describe('color scale', () => {
  it('switches to log only above a 50-fold positive range', () => {
    expect(createColorScale([1, 51]).logarithmic).toBe(true)
    expect(createColorScale([1, 50]).logarithmic).toBe(false)
    expect(createColorScale([0, 100]).logarithmic).toBe(false)
    const log = createColorScale([1, 10000])
    expect(log.ticks[2]).toBeCloseTo(100)
    expect(createColorScale([0, 100]).ticks[2]).toBe(50)
  })
  it.each(['light', 'dark'] as const)('distinguishes missing data from zero and viridis in %s', theme => {
    const scale = createColorScale([0, 100], theme)
    expect(scale.color(null)).toBe(missingColors[theme])
    expect(scale.color(0)).not.toBe(scale.color(null))
    expect(scale.color(50)).not.toBe(scale.color(null))
    expect(scale.color(NaN)).toBe(scale.color(null))
    // WCAG non-text contrast against each theme's canvas background.
    const luminance = (hex: string) => {
      const rgb = hex.slice(1).match(/../g)!.map(n => parseInt(n, 16) / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4)
      return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
    }
    const a = luminance(missingColors[theme]), b = luminance(theme === 'dark' ? '#07121e' : '#edf2f6')
    expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toBeGreaterThan(3)
  })
  it('clamps outside the fixed domain and handles equal or empty domains', () => {
    const scale = createColorScale([1, 100])
    expect(scale.color(0)).toBe(scale.color(1))
    expect(scale.color(1000)).toBe(scale.color(100))
    expect(createColorScale([0, 0]).color(0)).toMatch(/^#/)
    expect(currentDomain([null, 0, 12])).toEqual([0, 12])
    expect(currentDomain([null])).toEqual([0, 0])
  })
})
