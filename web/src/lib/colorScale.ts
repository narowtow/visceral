import { scaleLinear, scaleLog } from 'd3-scale'
import { interpolateViridis } from 'd3-scale-chromatic'
import type { Value } from '../data/contract'
export const missingColors = { dark: '#8b99ab', light: '#596679' }
export function currentDomain(values: Value[]): [number, number] {
  const available = values.filter((v): v is number => v !== null && Number.isFinite(v))
  return available.length ? [Math.min(...available), Math.max(...available)] : [0, 0]
}
export function createColorScale(domain: [number, number], theme: 'light' | 'dark' = 'dark') {
  const [min, max] = domain
  const logarithmic = min > 0 && max / min > 50
  const scale = (logarithmic ? scaleLog() : scaleLinear()).domain(min === max ? [min, min + 1] : domain).range([0, 1]).clamp(true)
  return {
    domain, logarithmic,
    color: (value: Value) => value === null || !Number.isFinite(value) ? missingColors[theme] : interpolateViridis(scale(logarithmic ? Math.max(min, value) : value)),
    ticks: Array.from({ length: 5 }, (_, i) => min === max ? min : scale.invert(i / 4)),
    gradient: `linear-gradient(to right, ${Array.from({ length: 11 }, (_, i) => interpolateViridis(i / 10)).join(', ')})`,
  }
}
