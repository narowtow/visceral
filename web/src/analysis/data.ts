import { organs } from '../data/contract'
import type { Measure, Value } from '../data/contract'
import { DATA_BASE, fetchJson } from '../data/client'

interface ByOrgan { organ: string }
interface ByMeasure extends ByOrgan { measure: Measure }
interface Quantiles { p05: Value; median: Value; p95: Value }
interface Correlation { n: number; rho: Value; max_abs_rank_change: number }
export interface FigureRows {
  'age-rankings': ByMeasure & { location: string; rate: number; ageStdRate: number; rank_a: number; rank_b: number; rank_change: number; population_70_plus: number }
  'rank-correlations': ByMeasure & Correlation
  'organ-rankings': Correlation & { measure: Measure; location: string }
  'global-trends': ByMeasure & { year: number; count: Value; rate: Value; ageStdRate: Value }
  'country-trends': ByMeasure & Quantiles
  'pandemic-decomposition': { measure: Measure; year: number; metric: 'count' | 'ageStdRate'; baseline: number; observed: number; change: number; cause_change: number; other_change: number; cause_share_of_net_change_percent: Value }
  'age-methods': ByOrgan & Quantiles & { n: number; world_70_plus_share: Value; within_organ_age_rho: Value }
  'standard-rankings': ByMeasure & Correlation & { standard: string }
  'standard-organ-rankings': ByMeasure & { standard: string; ageStdRate: number; rank: number }
  'standards-mapping': ByMeasure & { count_share_base: number; count_share_alt: number; ageStdRate_base: number; ageStdRate_alt: number; rank_base: number; rank_alt: number; rank_change: number }
  'country-patterns': { location: string; name: string; cluster: number; pc1: number; pc2: number; hierarchical_cluster: number; composition_cluster: number }
  'cluster-selection': { k: number; silhouette: number; ari_p05: number; ari_median: number; ari_p95: number; ari_mean: number; min_size: number; resamples: number }
  'cluster-centroids': ByOrgan & { cluster: number; z: number; log_space_rate: number; median_rate: number; n: number }
  'sex-ratios': ByMeasure & Quantiles & { world_ratio: Value; n: number; p25: Value; p75: Value }
}
export type FigureId = keyof FigureRows
export interface Figure<K extends FigureId = FigureId> {
  schemaVersion: 1; id: K; title: string; description: string; data: FigureRows[K][]
}
export interface FigureEntry { id: FigureId; title: string; file: string; takeaway: string }
export interface AnalysisIndex { schemaVersion: 1; figures: FigureEntry[] }
export const findingIds = ['age-structure', 'pandemic', 'method', 'patterns', 'sex'] as const
export type FindingId = typeof findingIds[number]
export interface Finding { id: FindingId; headline: string; detail: string; numbers: Record<string, number>; figureIds: FigureId[] }
export interface Findings { schemaVersion: 1; findings: Finding[] }

type Rule = (value: unknown) => boolean
const text: Rule = value => typeof value === 'string' && value.trim().length > 0
const finite: Rule = value => typeof value === 'number' && Number.isFinite(value)
const nullable = (rule: Rule): Rule => value => value === null || rule(value)
const nonnegative: Rule = value => finite(value) && (value as number) >= 0
const integer: Rule = value => nonnegative(value) && Number.isInteger(value)
const choice = (values: readonly unknown[]): Rule => value => values.includes(value)
const correlation: Rule = value => finite(value) && Math.abs(value as number) <= 1
const percentage: Rule = value => nonnegative(value) && (value as number) <= 100
// expm1 of a reconstructed near-zero centroid can be a tiny negative residue.
// Preserve that source value, while rejecting materially negative rates.
const reconstructedRate: Rule = value => finite(value) && (value as number) >= -1e-12
const organ: Rule = choice(organs.map(item => item.id))
const location: Rule = value => typeof value === 'string' && /^[A-Z]{3}$/.test(value)
const measure = choice(['deaths', 'dalys'])
const standard = choice(['WHO2026', 'WHO2021', 'Segi', 'Scandinavian', 'European2013'])
const quantiles = { p05: nullable(finite), median: nullable(finite), p95: nullable(finite) }
const correlations = { n: integer, rho: nullable(correlation), max_abs_rank_change: nonnegative }
// Every exported row field is checked, including the supplementary figures.
const schemas: Record<FigureId, Record<string, Rule>> = {
  'age-rankings': { organ, measure, location, rate: nonnegative, ageStdRate: nonnegative, rank_a: nonnegative, rank_b: nonnegative, rank_change: finite, population_70_plus: percentage },
  'rank-correlations': { organ, measure, ...correlations },
  'organ-rankings': { measure, location, ...correlations },
  'global-trends': { organ, measure, year: integer, count: nullable(nonnegative), rate: nullable(nonnegative), ageStdRate: nullable(nonnegative) },
  'country-trends': { organ, measure, ...quantiles },
  'pandemic-decomposition': { measure, year: integer, metric: choice(['count', 'ageStdRate']), baseline: nonnegative, observed: nonnegative, change: finite, cause_change: finite, other_change: finite, cause_share_of_net_change_percent: nullable(finite) },
  'age-methods': { organ, n: integer, ...quantiles, world_70_plus_share: nullable(percentage), within_organ_age_rho: nullable(correlation) },
  'standard-rankings': { organ, measure, standard, ...correlations },
  'standard-organ-rankings': { organ, measure, standard, ageStdRate: nonnegative, rank: nonnegative },
  'standards-mapping': { organ, measure, count_share_base: percentage, count_share_alt: percentage, ageStdRate_base: nonnegative, ageStdRate_alt: nonnegative, rank_base: nonnegative, rank_alt: nonnegative, rank_change: finite },
  'country-patterns': { location, name: text, cluster: choice([1, 2]), pc1: finite, pc2: finite, hierarchical_cluster: choice([1, 2]), composition_cluster: choice([1, 2]) },
  'cluster-selection': { k: integer, silhouette: correlation, ari_p05: correlation, ari_median: correlation, ari_p95: correlation, ari_mean: correlation, min_size: integer, resamples: integer },
  'cluster-centroids': { organ, cluster: choice([1, 2]), z: finite, log_space_rate: reconstructedRate, median_rate: nonnegative, n: integer },
  'sex-ratios': { organ, measure, n: integer, p05: nullable(nonnegative), median: nullable(nonnegative), p95: nullable(nonnegative), world_ratio: nullable(nonnegative), p25: nullable(nonnegative), p75: nullable(nonnegative) },
}
export const figureIds = Object.keys(schemas) as FigureId[]
function fail(path: string, expected: string): never { throw new Error(`Invalid analysis data: ${path} — expected ${expected}.`) }
function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'an object')
  return value as Record<string, unknown>
}
function check(value: unknown, rule: Rule, path: string) { if (!rule(value)) fail(path, 'a valid value (correct type, finite number and permitted range)') }
function envelope(value: unknown, path: string) {
  const result = object(value, path)
  if (result.schemaVersion !== 1) fail(`${path}.schemaVersion`, '1')
  return result
}
export function parseFigure<K extends FigureId>(id: K, value: unknown): Figure<K> {
  const path = `${id}.json`, result = envelope(value, path)
  if (result.id !== id) fail(`${path}.id`, id)
  check(result.title, text, `${path}.title`)
  check(result.description, text, `${path}.description`)
  if (!Array.isArray(result.data) || !result.data.length) fail(`${path}.data`, 'a nonempty row array')
  result.data.forEach((value, index) => {
    const row = object(value, `${path}.data[${index}]`)
    for (const [field, rule] of Object.entries(schemas[id])) check(row[field], rule, `${path}.data[${index}].${field}`)
    if (typeof row.p05 === 'number' && typeof row.median === 'number' && typeof row.p95 === 'number' && !(row.p05 <= row.median && row.median <= row.p95)) fail(`${path}.data[${index}]`, 'p05 ≤ median ≤ p95')
  })
  if (id === 'cluster-centroids') {
    const rows = result.data as FigureRows['cluster-centroids'][]
    for (const organ of new Set(rows.map(row => row.organ))) {
      if (![1, 2].every(cluster => rows.filter(row => row.organ === organ && row.cluster === cluster).length === 1)) fail(`${path}.data.${organ}`, 'exactly one centroid per pattern')
    }
  }
  return result as unknown as Figure<K>
}
export function parseIndex(value: unknown): AnalysisIndex {
  const result = envelope(value, 'index.json')
  if (!Array.isArray(result.figures) || !result.figures.length) fail('index.json.figures', 'a nonempty array')
  const seen = new Set()
  for (const [index, value] of result.figures.entries()) {
    const row = object(value, `index.json.figures[${index}]`)
    check(row.id, choice(figureIds), `index.json.figures[${index}].id`)
    if (seen.has(row.id)) fail(`index.json.figures[${index}].id`, 'a unique figure id')
    seen.add(row.id)
    if (row.file !== `${row.id}.json`) fail(`index.json.figures[${index}].file`, 'the local figure filename')
    check(row.title, text, `index.json.figures[${index}].title`)
    check(row.takeaway, text, `index.json.figures[${index}].takeaway`)
  }
  return result as unknown as AnalysisIndex
}
export function parseFindings(value: unknown): Findings {
  const result = envelope(value, 'findings.json')
  if (!Array.isArray(result.findings) || !result.findings.length) fail('findings.json.findings', 'a nonempty array')
  const seen = new Set()
  result.findings.forEach((value, index) => {
    const path = `findings.json.findings[${index}]`, row = object(value, path)
    check(row.id, choice(findingIds), `${path}.id`)
    if (seen.has(row.id)) fail(`${path}.id`, 'a unique finding id')
    seen.add(row.id)
    check(row.headline, text, `${path}.headline`)
    check(row.detail, text, `${path}.detail`)
    const numbers = object(row.numbers, `${path}.numbers`)
    if (!Object.keys(numbers).length) fail(`${path}.numbers`, 'headline numbers')
    for (const [key, value] of Object.entries(numbers)) check(value, finite, `${path}.numbers.${key}`)
    if (row.id === 'patterns') for (const key of ['wardARI', 'compositionARI']) check(numbers[key], correlation, `${path}.numbers.${key}`)
    if (!Array.isArray(row.figureIds) || !row.figureIds.length) fail(`${path}.figureIds`, 'figure ids')
    row.figureIds.forEach(id => check(id, choice(figureIds), `${path}.figureIds`))
  })
  return result as unknown as Findings
}
export const loadFigure = <K extends FigureId>(id: K, signal?: AbortSignal) =>
  fetchJson<unknown>(`${DATA_BASE}analysis/${id}.json`, signal).then(value => parseFigure(id, value))
