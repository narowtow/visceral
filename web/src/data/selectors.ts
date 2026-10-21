import { organIndex, organs } from './contract'
import type { Age, LocationShard, Measure, Metric, Selection, Sex, Value } from './contract'

export function valueFor(shard: LocationShard | undefined, measure: Measure, year: number, sex: Sex, age: Age, metric: Metric, organId: string): Value {
  const column = organIndex.get(organId)
  if (column === undefined || (metric === 'ageStdRate' && age !== 'all')) return null
  return shard?.values[measure]?.[year]?.[sex]?.[age]?.[metric]?.[column] ?? null
}
export const selectedValue = (shard: LocationShard | undefined, s: Selection, id: string) =>
  valueFor(shard, s.measure, s.year, s.sex, s.age, s.metric, id)
export function trend(shard: LocationShard | undefined, years: number[], s: Selection, id: string) {
  return years.map(year => ({ year, value: valueFor(shard, s.measure, year, s.sex, s.age, s.metric, id) }))
}
export function ranking(shard: LocationShard | undefined, s: Selection) {
  return organs.map(organ => ({ ...organ, value: selectedValue(shard, s, organ.id) }))
    .sort((a, b) => a.value === null ? (b.value === null ? 0 : 1) : b.value === null ? -1 : b.value - a.value)
}
export const populationFor = (shard: LocationShard | undefined, s: Selection): Value =>
  shard?.population[s.year]?.[s.sex]?.[s.age] ?? null
export function leadingCauses(shard: LocationShard | undefined, s: Selection, id: string) {
  return s.age === 'all' ? shard?.topCauses[s.measure]?.[s.year]?.[s.sex]?.[id] ?? [] : []
}
