// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import type { Causes } from './contract'
import { filterCauses } from './causeMapping'

const { causes } = JSON.parse(readFileSync('public/data/causes.json', 'utf8')) as Causes
it('defaults to counted primary causes and can include hierarchy rows', () => {
  expect(filterCauses(causes, '')).toHaveLength(95)
  expect(filterCauses(causes, '', false)).toHaveLength(causes.length)
  expect(filterCauses(causes, '').every(cause => cause.relation === 'primary')).toBe(true)
})
it('searches codes, names, organ labels and rationale with case-insensitive terms', () => {
  expect(filterCauses(causes, '1130').map(cause => cause.name)).toEqual(['Ischaemic heart disease'])
  expect(filterCauses(causes, '  STROKE ').map(cause => cause.organ)).toContain('brain')
  expect(filterCauses(causes, 'Bones joints').map(cause => cause.name)).toContain('Musculoskeletal diseases')
  expect(filterCauses(causes, 'site disaggregated').map(cause => cause.code)).toContain(30)
  expect(filterCauses(causes, 'no such cause')).toEqual([])
})
