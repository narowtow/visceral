import { organs } from '../data/contract'
import type { Manifest, Selection } from '../data/contract'
export const defaults: Selection = { location: 'WLD', sex: 'both', age: 'all', year: 2023, measure: 'deaths', metric: 'ageStdRate', selectedOrgan: 'heart' }
export function normalizeSelection(input: Partial<Selection>, manifest: Manifest): Selection {
  const choose = <T extends string>(value: T | undefined, ids: T[], fallback: T): T => ids.includes(value as T) ? value as T : (ids.includes(fallback) ? fallback : ids[0])
  const age = choose(input.age, manifest.ageGroups.map(o => o.id), defaults.age)
  let metric = choose(input.metric, manifest.metrics.map(o => o.id), defaults.metric)
  if (age !== 'all' && metric === 'ageStdRate') metric = 'rate'
  return {
    location: choose(input.location, manifest.locations.map(o => o.id), defaults.location),
    sex: choose(input.sex, manifest.sexes.map(o => o.id), defaults.sex), age, metric,
    year: manifest.years.includes(input.year as number) ? input.year as number : Math.max(...manifest.years),
    measure: choose(input.measure, manifest.measures.map(o => o.id), defaults.measure),
    selectedOrgan: input.selectedOrgan === null ? null : organs.some(o => o.id === input.selectedOrgan) ? input.selectedOrgan! : defaults.selectedOrgan,
  }
}
export function parseHash(hash: string, manifest: Manifest): Selection {
  const params = new URLSearchParams(hash.split('?')[1] ?? '')
  const input = Object.fromEntries(params) as Partial<Selection>
  return normalizeSelection({ ...input, year: params.has('year') ? Number(params.get('year')) : undefined,
    selectedOrgan: params.get('selectedOrgan') === 'none' ? null : params.get('selectedOrgan') ?? undefined }, manifest)
}
export const routeFromHash = (hash: string) => {
  const route = hash.replace(/^#\/?/, '').split('?')[0]
  return ['explore', 'analysis', 'methodology', 'about', 'quiz'].includes(route) ? route : 'explore'
}
export function serializeHash(s: Selection, route = 'explore'): string {
  return `#/${route}?${new URLSearchParams({ location: s.location, sex: s.sex, age: s.age, year: String(s.year), measure: s.measure, metric: s.metric, selectedOrgan: s.selectedOrgan ?? 'none' })}`
}
