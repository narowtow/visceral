// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { organIndex, organs } from '../data/contract'
import type { Manifest, Summary } from '../data/contract'
import fixtureManifest from '@contracts/fixtures/data/manifest.json'
import fixtureSummary from '@contracts/fixtures/data/summary/2023.json'
import { findableOrgans, generateFindQuestions, generateHigherQuestions, sufficientlyDifferent } from './questions'

const realManifest = JSON.parse(readFileSync('public/data/manifest.json', 'utf8')) as Manifest
const realSummary = JSON.parse(readFileSync('public/data/summary/2023.json', 'utf8')) as Summary
describe('seeded quiz questions', () => {
  it('chooses ten distinct findable organs deterministically', () => {
    const questions = generateFindQuestions('visceral')
    expect(questions).toHaveLength(10)
    expect(questions).toEqual(generateFindQuestions('visceral'))
    expect(questions).not.toEqual(generateFindQuestions('another set'))
    expect(new Set(questions.map(question => question.correctId)).size).toBe(10)
    for (const question of questions) expect(findableOrgans.some(organ => organ.id === question.correctId)).toBe(true)
    expect(findableOrgans.every(organ => organ.modeled && organ.layer === 'organs')).toBe(true)
  })
  it.each([
    ['real WHO', realSummary, realManifest],
    ['synthetic fixture', fixtureSummary as Summary, fixtureManifest as Manifest],
  ] as const)('uses exact non-null, separated values from %s', (_label, summary, manifest) => {
    const questions = generateHigherQuestions(summary, manifest, 'visceral')
    expect(questions).toHaveLength(10)
    expect(questions).toEqual(generateHigherQuestions(summary, manifest, 'visceral'))
    expect(questions).not.toEqual(generateHigherQuestions(summary, manifest, 'different seed'))
    const contexts = questions.map(question => [question.location, ...[question.a.id, question.b.id].sort()].join(':'))
    expect(new Set(contexts).size).toBe(10)
    for (const question of questions) {
      expect(manifest.locations.find(location => location.id === question.location)?.kind).toBe('country')
      expect(question.year).toBe(2023)
      for (const option of [question.a, question.b]) {
        expect(Number.isFinite(option.value)).toBe(true)
        expect(option.value).toBeGreaterThanOrEqual(0)
        expect(organs.find(organ => organ.id === option.id)?.kind).toBe('organ')
        expect(option.value).toBe(summary.values.deaths!.both!.ageStdRate![summary.locations.indexOf(question.location)][organIndex.get(option.id)!])
      }
      expect(Math.abs(question.a.value - question.b.value) / Math.max(question.a.value, question.b.value)).toBeGreaterThanOrEqual(.1)
      expect(question.correctId).toBe(question.a.value > question.b.value ? question.a.id : question.b.id)
    }
  })
  it('rejects nulls, negative/nonfinite values and near-ties; preserves real zero', () => {
    const summary: Summary = { schemaVersion: 1, year: 2023, locations: ['JPN'], values: { deaths: { both: { ageStdRate: [organs.map(() => null)] } } } }
    const row = summary.values.deaths!.both!.ageStdRate![0]
    expect(generateHigherQuestions(summary, realManifest, 'test')).toEqual([])
    row[organIndex.get('heart')!] = 100
    row[organIndex.get('brain')!] = 105
    expect(generateHigherQuestions(summary, realManifest, 'test')).toEqual([])
    row[organIndex.get('brain')!] = 0
    const questions = generateHigherQuestions(summary, realManifest, 'test', 1)
    expect(questions).toHaveLength(1)
    expect([questions[0].a.value, questions[0].b.value].sort((a, b) => a - b)).toEqual([0, 100])
    expect(sufficientlyDifferent(100, 90)).toBe(true)
    expect(sufficientlyDifferent(100, 91)).toBe(false)
    expect(sufficientlyDifferent(0, 0)).toBe(false)
    expect(sufficientlyDifferent(Infinity, 1)).toBe(false)
    expect(sufficientlyDifferent(NaN, 1)).toBe(false)
    expect(sufficientlyDifferent(-1, 10)).toBe(false)
  })
})
