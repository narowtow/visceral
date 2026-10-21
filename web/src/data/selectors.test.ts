import { describe, expect, it } from 'vitest'
import fixture from '@contracts/fixtures/data/locations/WLD.json'
import manifestFixture from '@contracts/fixtures/data/manifest.json'
import { organs, validateManifest } from './contract'
import type { LocationShard, Manifest } from './contract'
import { leadingCauses, populationFor, ranking, trend, valueFor } from './selectors'
import { defaults } from '../state/url'
const shard = fixture as LocationShard
const manifest = manifestFixture as Manifest
describe('contract selectors on the synthetic fixture', () => {
  it('uses contract column order for every organ and all metric variants', () => {
    for (const measure of ['deaths', 'dalys'] as const) for (const metric of ['count', 'rate', 'ageStdRate'] as const) {
      organs.forEach((organ, index) => expect(valueFor(shard, measure, 2023, 'both', 'all', metric, organ.id)).toBe(fixture.values[measure]['2023'].both.all[metric][index]))
    }
  })
  it('preserves genuine zeros and unavailable dimensions', () => {
    expect(valueFor(shard, 'deaths', 2023, 'male', 'all', 'count', 'ovaries')).toBe(0)
    expect(valueFor(shard, 'deaths', 1900, 'both', 'all', 'rate', 'heart')).toBeNull()
    expect(valueFor(shard, 'deaths', 2023, 'both', '0_4', 'ageStdRate', 'heart')).toBeNull()
    expect(valueFor(shard, 'deaths', 2023, 'both', 'all', 'rate', 'unknown')).toBeNull()
    expect(valueFor(undefined, 'deaths', 2023, 'both', 'all', 'count', 'heart')).toBeNull()
  })
  it('keeps irregular year spacing and missing trend values', () => {
    const points = trend(shard, [...manifest.years, 2024], defaults, 'heart')
    expect(points.map(p => p.year)).toEqual([2000, 2010, 2015, 2019, 2020, 2021, 2022, 2023, 2024])
    expect(points[0].value).toBe(313.6)
    expect(points.at(-1)?.value).toBeNull()
  })
  it('ranks all groups descending, with nulls after zeros', () => {
    const rows = ranking(shard, defaults)
    expect(rows).toHaveLength(organs.length)
    expect(rows[0].id).toBe('heart')
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].value ?? Infinity).toBeGreaterThanOrEqual(rows[i].value ?? -Infinity)
    const partial = structuredClone(shard)
    partial.values.deaths!['2023']!.both!.all!.count![0] = null
    partial.values.deaths!['2023']!.both!.all!.count![1] = 0
    const ranked = ranking(partial, { ...defaults, metric: 'count' })
    expect(ranked.at(-1)?.id).toBe('brain')
    expect(ranked.at(-2)?.value).toBe(0)
  })
  it('selects population and limits causes to all ages', () => {
    expect(populationFor(shard, defaults)).toBe(8100000000)
    expect(leadingCauses(shard, defaults, 'heart')[0].code).toBe(1130)
    expect(leadingCauses(shard, { ...defaults, age: '0_4' }, 'heart')).toEqual([])
  })
  it('rejects column-order and schema mismatches before displaying data', () => {
    expect(validateManifest(manifest)).toBe(manifest)
    expect(() => validateManifest({ ...manifest, organs: [...manifest.organs].reverse() })).toThrow(/column order/)
    expect(() => validateManifest({ ...manifest, schemaVersion: 2 })).toThrow(/contract/)
  })
})
