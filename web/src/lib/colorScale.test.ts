import { describe, expect, it } from 'vitest'
import { createColorScale, currentDomain, displayDomain, formatScaleTick, missingColors } from './colorScale'

describe('color scale', () => {
  it('switches to log only above a 50-fold positive range', () => {
    expect(createColorScale([1, 51]).logarithmic).toBe(true)
    expect(createColorScale([1, 50]).logarithmic).toBe(false)
    expect(createColorScale([0, 100]).logarithmic).toBe(false)
    const log = createColorScale([1, 10000])
    expect(log.domain).toEqual([10, 10000])
    expect(log.ticks).toEqual([10, 100, 1000, 10000])
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
    expect(createColorScale([0, 0]).tickLabels.map(t => t.label)).toEqual(['0'])
  })
  it('limits extreme positive display ranges without changing the manifest or values', () => {
    const raw: [number, number] = [.0001, 2300]
    const scale = createColorScale(raw)
    expect(raw).toEqual([.0001, 2300])
    expect(scale.sourceDomain).toEqual(raw)
    expect(scale.domain).toEqual([2.3, 2300])
    expect(scale.lowerClamped).toBe(true)
    expect(scale.color(.0001)).toBe(scale.color(2.3))
    expect(scale.color(0)).toBe(scale.color(2.3))
    expect(scale.color(null)).not.toBe(scale.color(0))
    expect(new Set([10, 100, 1000].map(scale.color)).size).toBe(3)
    expect(scale.tickLabels.map(t => t.label)).toEqual(['<2.3', '10', '100', '2.3K'])
    expect(scale.tickLabels.map(t => t.position)).toEqual([...scale.tickLabels.map(t => t.position)].sort((a, b) => a - b))
    expect(scale.tickLabels[1].position).not.toBeCloseTo(100 / 3)
  })
  it('preserves zero-based, small, and already readable domains', () => {
    expect(displayDomain([0, 2300])).toEqual([0, 2300])
    expect(displayDomain([5, 2300])).toEqual([5, 2300])
    expect(displayDomain([2, 2])).toEqual([2, 2])
    expect(createColorScale([.0000001, .1]).domain).toEqual([.0001, .1])
    expect(formatScaleTick(.0001)).toBe('0.0001')
    expect(formatScaleTick(1000)).toBe('1K')
    expect(createColorScale([.0000001, .1]).tickLabels.every(t => t.label !== '0')).toBe(true)
  })
})
