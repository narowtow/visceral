import { afterEach, describe, expect, it } from 'vitest'
import fixture from '@contracts/fixtures/data/manifest.json'
import type { Manifest, Selection } from '../data/contract'
import { defaults, normalizeSelection, parseHash, routeFromHash, serializeHash } from './url'
import { syncUrl, useExplorer } from './store'
const manifest = fixture as Manifest
afterEach(() => { window.history.replaceState(null, '', '/'); useExplorer.setState({ selection: defaults }) })
describe('URL state', () => {
  it.each(['heart', 'kidneys', null])('round trips every shareable field with %s selected', selectedOrgan => {
    const s: Selection = { location: 'JPN', sex: 'female', age: '30_49', year: 2019, measure: 'dalys', metric: 'rate', selectedOrgan }
    expect(parseHash(serializeHash(s), manifest)).toEqual(s)
  })
  it('falls back for invalid parameters and unknown routes', () => {
    expect(parseHash('#/explore?location=XYZ&sex=invalid&age=oops&year=2001&measure=no&metric=bad&selectedOrgan=no', manifest)).toEqual(defaults)
    expect(routeFromHash('#/unknown')).toBe('explore')
    expect(routeFromHash('#/about?year=2023')).toBe('about')
    expect(routeFromHash('#/quiz?year=2023')).toBe('quiz')
  })
  it('converts age-standardized rates to crude rates for a specific age', () => {
    expect(parseHash('#/explore?age=5_14&metric=ageStdRate', manifest).metric).toBe('rate')
    expect(normalizeSelection({ ...defaults, age: '5_14', metric: 'count' }, manifest).metric).toBe('count')
  })
  it('exits isolation when selecting a list-only or systemic group or clearing selection', () => {
    useExplorer.setState({ selection: defaults, isolate: true })
    useExplorer.getState().selectOrgan('kidneys')
    expect(useExplorer.getState().isolate).toBe(true)
    useExplorer.getState().selectOrgan('diabetes_endocrine')
    expect(useExplorer.getState().isolate).toBe(false)
    useExplorer.setState({ isolate: true })
    useExplorer.getState().selectOrgan(null)
    expect(useExplorer.getState().isolate).toBe(false)
  })
  it('synchronizes store changes and incoming hash navigation without losing the route', () => {
    window.history.replaceState(null, '', '#/explore?location=JPN')
    const stop = syncUrl(manifest)
    expect(useExplorer.getState().selection.location).toBe('JPN')
    useExplorer.getState().selectOrgan('kidneys')
    expect(window.location.hash).toContain('selectedOrgan=kidneys')
    window.history.replaceState(null, '', '#/about?location=USA&selectedOrgan=none')
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(useExplorer.getState().selection.selectedOrgan).toBeNull()
    expect(useExplorer.getState().selection.location).toBe('USA')
    useExplorer.getState().setFilters({ age: '0_4' }, manifest)
    expect(window.location.hash).toContain('#/about?')
    expect(useExplorer.getState().selection.metric).toBe('rate')
    stop()
  })
})
