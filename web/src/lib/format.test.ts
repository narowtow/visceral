import { describe, expect, it } from 'vitest'
import { formatBurden, formatValue } from './format'

describe('small burden values', () => {
  it('distinguishes null, zero, values rounded to zero, and visible decimals', () => {
    expect(formatBurden(null)).toBe('No data')
    expect(formatBurden(0)).toBe('<0.1')
    expect(formatBurden(.0001)).toBe('<0.1')
    expect(formatBurden(.01)).toBe('0.01')
    expect(formatBurden(.01, true)).toBe('<0.1')
    expect(formatBurden(.1, true)).toBe('0.1')
    expect(formatBurden(217.1)).toBe('217.1')
  })
  it('preserves zero in numeric axes and source tables', () => {
    expect(formatValue(0)).toBe('0')
    expect(formatValue(0, true)).toBe('0')
    expect(formatValue(null)).toBe('No data')
  })
})
