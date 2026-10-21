import contract from '@contracts/organs.json'

export type Measure = 'deaths' | 'dalys'
export type Metric = 'count' | 'rate' | 'ageStdRate'
export type Sex = 'both' | 'male' | 'female'
export type Age = 'all' | '0_4' | '5_14' | '15_29' | '30_49' | '50_59' | '60_69' | '70_plus'
export type Value = number | null
export type Layer = 'skin' | 'skeleton' | 'organs'
export interface Organ {
  id: string; label: string; kind: string; system: string; layer: string
  modeled: boolean; meshNames: string[]; relatedOrgans: string[]
}
export const organs: Organ[] = contract.organs
export const organIndex = new Map(organs.map((organ, index) => [organ.id, index]))
type Option<T> = { id: T; label: string; ageGroups?: Age[] }
export interface Manifest {
  schemaVersion: number; datasetRelease: string; mappingVersion: string
  generatedAt: string; standardPopulation: string; years: number[]
  sexes: Option<Sex>[]; ageGroups: Option<Age>[]; measures: Option<Measure>[]; metrics: Option<Metric>[]
  organs: string[]; locations: { id: string; name: string; kind: string }[]
  colorDomains: Record<`${Measure}.${Metric}`, [number, number]>
  provenance: { sources: { id: string; citation: string; url: string; terms: string; retrievedAt: string }[]; notes: string[] }
}
type Dict<T> = Partial<Record<string, T>>
export interface LocationShard {
  schemaVersion: number; location: string
  population: Dict<Dict<Dict<Value>>>
  values: Partial<Record<Measure, Dict<Dict<Dict<Partial<Record<Metric, Value[]>>>>>>>
  topCauses: Partial<Record<Measure, Dict<Dict<Dict<TopCause[]>>>>>
}
export interface TopCause { code: number; count: Value; rate: Value }
export interface Causes {
  schemaVersion: number; mappingVersion: string
  causes: { code: number; name: string; parent: number | null; level: number; organ: string | null; relation: string; rationale: string }[]
}
export interface Selection {
  location: string; sex: Sex; age: Age; year: number; measure: Measure; metric: Metric; selectedOrgan: string | null
}
export function validateManifest(manifest: Manifest): Manifest {
  if (manifest.schemaVersion !== 1 || manifest.organs?.join('|') !== organs.map(o => o.id).join('|')) {
    throw new Error('Unsupported data contract or organ column order. Please rebuild the dataset.')
  }
  if (!manifest.years.length || !manifest.locations.length) throw new Error('Dataset has no years or locations.')
  return manifest
}
