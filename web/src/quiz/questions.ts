import { organIndex, organs } from '../data/contract'
import type { Manifest, Summary } from '../data/contract'

export const QUESTION_COUNT = 10
export const findableOrgans = organs.filter(organ => organ.modeled && organ.layer === 'organs')
export interface FindQuestion { kind: 'find'; correctId: string }
export interface ComparisonValue { id: string; value: number }
export interface HigherQuestion {
  kind: 'higher'; location: string; country: string; year: number
  a: ComparisonValue; b: ComparisonValue; correctId: string
}
export type Question = FindQuestion | HigherQuestion
export type QuizMode = Question['kind']

/** Stable across browsers; no dependency on Math.random, locale sorting or time. */
function seededRandom(seed: string) {
  let state = 2166136261
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619)
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ state >>> 15, 1 | state)
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}
function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const temporary = result[i]
    result[i] = result[j]
    result[j] = temporary
  }
  return result
}
export function generateFindQuestions(seed: string, count = QUESTION_COUNT): FindQuestion[] {
  return shuffled(findableOrgans, seededRandom(seed)).slice(0, count).map(organ => ({ kind: 'find', correctId: organ.id }))
}
export const organName = (id: string) => organs.find(organ => organ.id === id)?.label ?? id
export function questionText(question: Question): string {
  return question.kind === 'find' ? `Find: ${organName(question.correctId)}`
    : `In ${question.country} (${question.year}), which had more age-standardized deaths per 100,000: ${organName(question.a.id)} or ${organName(question.b.id)}?`
}
export function sufficientlyDifferent(a: number, b: number) {
  const max = Math.max(a, b)
  // Relative to the larger value, so every accepted pair is at least 10% apart.
  return Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b >= 0 && max > 0 && (max - Math.min(a, b)) / max >= .1
}
export function generateHigherQuestions(summary: Summary, manifest: Manifest, seed: string, count = QUESTION_COUNT): HigherQuestion[] {
  if (!manifest.years.includes(summary.year)) return []
  const random = seededRandom(`${seed}:${summary.year}`)
  const rows = summary.values.deaths?.both?.ageStdRate ?? []
  const countries = new Map(manifest.locations.filter(location => location.kind === 'country').map(location => [location.id, location.name]))
  const candidates: HigherQuestion[] = []
  const remainder: HigherQuestion[] = []
  const anatomical = organs.filter(organ => organ.kind === 'organ')
  // Enumerate admissible pairs before sampling: no retry loop or invented fallback.
  for (const row of shuffled(summary.locations.map((location, index) => ({ location, index })), random)) {
    const country = countries.get(row.location)
    if (!country) continue
    const pairs: HigherQuestion[] = []
    for (let i = 0; i < anatomical.length; i++) for (let j = i + 1; j < anatomical.length; j++) {
      const a = { id: anatomical[i].id, value: rows[row.index]?.[organIndex.get(anatomical[i].id)!] }
      const b = { id: anatomical[j].id, value: rows[row.index]?.[organIndex.get(anatomical[j].id)!] }
      if (a.value == null || b.value == null || !sufficientlyDifferent(a.value, b.value)) continue
      const pair = random() < .5 ? [a, b] : [b, a]
      pairs.push({ kind: 'higher', location: row.location, country, year: summary.year,
        a: { id: pair[0].id, value: pair[0].value! }, b: { id: pair[1].id, value: pair[1].value! },
        correctId: a.value > b.value ? a.id : b.id })
    }
    // Favor different countries, while small fixture sets can supply more pairs.
    const options = shuffled(pairs, random)
    if (options[0]) candidates.push(options[0])
    for (const option of options.slice(1)) remainder.push(option)
    if (candidates.length >= count) break
  }
  return candidates.concat(shuffled(remainder, random)).slice(0, count)
}
