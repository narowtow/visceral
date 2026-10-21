import { scaleLinear, scaleLog } from 'd3-scale'
import { interpolateViridis } from 'd3-scale-chromatic'
import type { Value } from '../data/contract'
export const missingColors = { dark: '#8b99ab', light: '#596679' }
export function currentDomain(values: Value[]): [number, number] {
  const available = values.filter((v): v is number => v !== null && Number.isFinite(v))
  return available.length ? [Math.min(...available), Math.max(...available)] : [0, 0]
}
/** Keep at most three orders of positive magnitude without fetching other shards.
 * The fixed manifest maximum makes this adjustment identical across filters.
 */
export function displayDomain([min, max]: [number, number]): [number, number] {
  return min > 0 && max > min ? [Math.max(min, max / 1000), max] : [min, max]
}
export const formatScaleTick = (value: number) => new Intl.NumberFormat('en', {
  maximumSignificantDigits: 2,
  notation: Math.abs(value) >= 1000 ? 'compact' : 'standard',
}).format(value)

export function createColorScale(domain: [number, number], theme: 'light' | 'dark' = 'dark') {
  const sourceDomain = domain
  const [min, max] = displayDomain(domain)
  const lowerClamped = min > domain[0]
  const logarithmic = min > 0 && max / min > 50
  const scale = (logarithmic ? scaleLog() : scaleLinear()).domain(min === max ? [min, min + 1] : [min, max]).range([0, 1]).clamp(true)
  const decades = logarithmic ? Array.from({ length: Math.max(0, Math.ceil(Math.log10(max)) - Math.floor(Math.log10(min))) }, (_, i) => 10 ** (Math.floor(Math.log10(min)) + i + 1)).filter(value => value > min && value < max) : []
  const ticks = min === max ? [min] : logarithmic ? [min, ...decades, max] : Array.from({ length: 5 }, (_, i) => scale.invert(i / 4))
  // Nearby endpoints and decade labels would collide; keep both endpoints.
  const visibleTicks = ticks.filter((value, i) => i === 0 || i === ticks.length - 1 || (scale(value) >= .14 && scale(value) <= .86))
  return {
    domain: [min, max] as [number, number], sourceDomain, lowerClamped, logarithmic,
    color: (value: Value) => value === null || !Number.isFinite(value) ? missingColors[theme] : interpolateViridis(scale(logarithmic ? Math.max(min, value) : value)),
    ticks: visibleTicks,
    tickLabels: visibleTicks.map((value, i) => ({ value, label: `${i === 0 && lowerClamped ? '<' : ''}${formatScaleTick(value)}`, position: min === max ? 0 : scale(value) * 100 })),
    gradient: min === max ? interpolateViridis(0) : `linear-gradient(to right, ${Array.from({ length: 11 }, (_, i) => interpolateViridis(i / 10)).join(', ')})`,
  }
}
