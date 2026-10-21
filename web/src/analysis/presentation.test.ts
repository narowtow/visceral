import { expect, it } from 'vitest'
import age from '../test/fixtures/analysis/age-rankings.json'
import trends from '../test/fixtures/analysis/global-trends.json'
import standards from '../test/fixtures/analysis/standard-organ-rankings.json'
import { parseFigure } from './data'
import { defaultControls, explorerHash, globalLines, rangeRow, selectedRows, standardWinners } from './presentation'

it('filters measures and organs without rewriting source rows', () => {
  const source = parseFigure('age-rankings', age)
  const rows = selectedRows(source, { ...defaultControls, organ: 'brain', measure: 'dalys' })
  expect(rows.length).toBeGreaterThan(0)
  expect(rows.every(row => 'organ' in row && row.organ === 'brain' && 'measure' in row && row.measure === 'dalys')).toBe(true)
  expect(source.data.length).toBe(age.data.length)
})
it('uses numeric observed years and finds standard-specific first ranks', () => {
  const lines = globalLines(parseFigure('global-trends', trends).data.filter(row => row.measure === 'deaths'))
  expect(lines.map(row => row.year)).toEqual([2000, 2010, 2015, 2019, 2020, 2021, 2022, 2023])
  const winners = standardWinners(parseFigure('standard-organ-rankings', standards).data.filter(row => row.measure === 'deaths'))
  expect(winners.find(row => row.standard === 'WHO2026')?.organ).toBe('heart')
  expect(winners.find(row => row.standard === 'Segi')?.organ).toBe('lungs')
})
it('keeps missing bounds absent and constructs explicit country explorer links', () => {
  expect(rangeRow('heart', null, null, null).interval).toBeUndefined()
  expect(rangeRow('heart', -10, -25, 5).interval).toEqual([15, 15])
  const params = new URLSearchParams(explorerHash('JPN', 'brain', 'dalys').split('?')[1])
  expect(Object.fromEntries(params)).toMatchObject({ location: 'JPN', selectedOrgan: 'brain', measure: 'dalys', metric: 'ageStdRate', year: '2023', age: 'all', sex: 'both' })
})
