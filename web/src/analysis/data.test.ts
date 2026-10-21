import { describe, expect, it, vi } from 'vitest'
import { DATA_BASE } from '../data/client'
import { figureIds, loadFigure, parseFigure, parseFindings, parseIndex } from './data'

const fixtures = import.meta.glob('../test/fixtures/analysis/*.json', { eager: true, import: 'default' })
const fixture = (id: string) => fixtures[`../test/fixtures/analysis/${id}.json`]
describe('analysis figure contracts', () => {
  it.each(figureIds)('validates and loads %s with a shared abortable fetch', async id => {
    const source = fixture(id)
    expect(parseFigure(id, source).data.length).toBeGreaterThan(0)
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(source)))
    const controller = new AbortController()
    expect((await loadFigure(id, controller.signal)).id).toBe(id)
    expect(fetcher).toHaveBeenCalledWith(`${DATA_BASE}analysis/${id}.json`, expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })
  it.each(figureIds)('gives file, row and field errors for malformed %s', id => {
    const source = structuredClone(fixture(id)) as { schemaVersion: number; id: string; data: Record<string, unknown>[] }
    source.schemaVersion = 2
    expect(() => parseFigure(id, source)).toThrow(`${id}.json.schemaVersion`)
    source.schemaVersion = 1
    source.id = 'wrong'
    expect(() => parseFigure(id, source)).toThrow(`${id}.json.id`)
    source.id = id
    const numeric = Object.keys(source.data[0]).find(key => typeof source.data[0][key] === 'number')!
    source.data[0][numeric] = NaN
    expect(() => parseFigure(id, source)).toThrow(`${id}.json.data[0].${numeric}`)
  })
  it('preserves null and zero, and checks quantile order', () => {
    const methods = parseFigure('age-methods', fixture('age-methods'))
    expect(methods.data.find(row => row.organ === 'muscles')?.median).toBeNull()
    const centroids = parseFigure('cluster-centroids', fixture('cluster-centroids'))
    expect(centroids.data.find(row => row.organ === 'eyes' && row.cluster === 1)?.log_space_rate).toBe(-8.674e-19)
    const badCentroid = structuredClone(centroids)
    badCentroid.data[0].log_space_rate = -1
    expect(() => parseFigure('cluster-centroids', badCentroid)).toThrow('log_space_rate')
    const ratios = parseFigure('sex-ratios', fixture('sex-ratios'))
    expect(ratios.data.some(row => row.p05 === 0)).toBe(true)
    const bad = structuredClone(methods)
    bad.data[0].p05 = 1000
    expect(() => parseFigure('age-methods', bad)).toThrow('p05 ≤ median ≤ p95')
  })
  it('validates index filenames, duplicate ids and findings references', () => {
    const index = parseIndex(fixture('index'))
    expect(index.figures).toHaveLength(14)
    const bad = structuredClone(index)
    bad.figures[0].file = '../private.json'
    expect(() => parseIndex(bad)).toThrow('local figure filename')
    bad.figures[0].file = index.figures[0].file
    bad.figures.push(bad.figures[0])
    expect(() => parseIndex(bad)).toThrow('unique figure id')
    const findings = parseFindings(fixture('findings'))
    expect(findings.findings).toHaveLength(5)
    const broken = structuredClone(findings)
    broken.findings[0].numbers.brainRho = Infinity
    expect(() => parseFindings(broken)).toThrow('numbers.brainRho')
    const badReference = structuredClone(findings) as unknown as { findings: { figureIds: string[] }[] }
    badReference.findings[0].figureIds.push('unknown')
    expect(() => parseFindings(badReference)).toThrow('figureIds')
  })
})
