import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import manifest from '@contracts/fixtures/data/manifest.json'
import causes from '@contracts/fixtures/data/causes.json'
import world from '@contracts/fixtures/data/locations/WLD.json'
import japan from '@contracts/fixtures/data/locations/JPN.json'
import summary from '@contracts/fixtures/data/summary/2023.json'
import { useExplorer } from './state/store'
import { defaults } from './state/url'
import App from './App'

vi.mock('./scene/BodyScene', () => ({ default: () => <div data-testid="mock-canvas">Canvas omitted in tests</div> }))
// These tests exercise chart data and tables, without jsdom layout measurements.
vi.mock('recharts', () => ({
  ResponsiveContainer: () => <div>Trend plot</div>, LineChart: () => null,
  CartesianGrid: () => null, Line: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null,
}))
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  window.history.replaceState(null, '', '#/explore')
  useExplorer.setState({ selection: defaults, theme: 'system', isolate: false, rescale: false, layers: { skin: true, skeleton: false, organs: true } })
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const path = String(input)
    const json = path.endsWith('manifest.json') ? manifest : path.endsWith('causes.json') ? causes : path.endsWith('summary/2023.json') ? summary : path.endsWith('JPN.json') ? japan : world
    return new Response(JSON.stringify(json), { headers: { 'Content-Type': 'application/json' } })
  })
})
afterEach(() => { window.history.replaceState(null, '', '/') })

describe('explorer shell without WebGL', () => {
  it('provides landmarks, route titles and one-time heading focus on every page', async () => {
    render(<App />)
    const explore = await screen.findByRole('heading', { level: 1, name: 'Explore population-level burden' })
    await waitFor(() => expect(explore).toHaveFocus())
    expect(screen.getByRole('banner')).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
    const footer = screen.getByRole('contentinfo', { name: 'Project credits' })
    expect(footer).toHaveTextContent('Data: WHO GHE 2023')
    expect(within(footer).getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/narowtow/visceral')
    fireEvent.click(screen.getByRole('link', { name: 'Skip to content' }))
    expect(screen.getByRole('main')).toHaveFocus()
    const sex = screen.getByRole('combobox', { name: 'Sex' })
    sex.focus(); fireEvent.change(sex, { target: { value: 'male' } })
    expect(sex).toHaveFocus()
    for (const route of ['about', 'methodology', 'quiz', 'analysis', 'explore']) {
      await act(async () => {
        window.history.replaceState(null, '', `#/${route}`)
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      })
      const heading = await screen.findByRole('heading', { level: 1 })
      await waitFor(() => expect(heading).toHaveFocus())
      expect(document.title).toBe(`${route[0].toUpperCase() + route.slice(1)} · Visceral`)
      expect(screen.getAllByRole('main')).toHaveLength(1)
      expect(screen.getAllByRole('contentinfo')).toHaveLength(1)
      let level = 0
      for (const h of screen.getAllByRole('heading')) {
        const next = Number(h.tagName.slice(1))
        expect(next - level, `${route}: ${h.textContent}`).toBeLessThanOrEqual(1)
        level = next
      }
    }
  })
  it('offers DALYs for sensory groups and preserves the selected organ and population', async () => {
    render(<App />)
    const list = await screen.findByRole('listbox', { name: 'Organ groups' })
    fireEvent.click(within(list).getByRole('option', { name: /Eyes/ }))
    expect(screen.getByText('Burden for this group is mostly disability, not deaths. Try DALYs.')).toBeVisible()
    const before = useExplorer.getState().selection
    fireEvent.click(screen.getByRole('button', { name: 'Show DALYs' }))
    expect(useExplorer.getState().selection).toEqual({ ...before, measure: 'dalys' })
    expect(window.location.hash).toContain('measure=dalys')
    expect(screen.getByRole('heading', { level: 2, name: 'Eyes' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Show DALYs' })).not.toBeInTheDocument()
  })
  it('labels fixtures, selects organs through the list, and exposes exact trend tables', async () => {
    render(<App />)
    expect(await screen.findByText('Synthetic data · not WHO estimates')).toBeVisible()
    const list = await screen.findByRole('listbox', { name: 'Organ groups' })
    const kidneys = within(list).getByRole('option', { name: /Kidneys/ })
    kidneys.focus(); fireEvent.keyDown(kidneys, { key: 'Enter' })
    expect(screen.getByRole('heading', { level: 2, name: 'Kidneys' })).toBeVisible()
    expect(window.location.hash).toContain('selectedOrgan=kidneys')
    const trendSection = await screen.findByRole('region', { name: 'Trend' })
    fireEvent.click(within(trendSection).getByRole('button', { name: 'Show table' }))
    const table = within(trendSection).getByRole('table')
    expect(within(table).getByRole('rowheader', { name: '2000' })).toBeVisible()
    expect(within(table).getAllByRole('row')).toHaveLength(manifest.years.length + 1)
    expect(screen.getByRole('status')).toHaveTextContent('Kidneys selected.')
    fireEvent.change(screen.getByRole('combobox', { name: 'Age group' }), { target: { value: '0_4' } })
    expect(useExplorer.getState().selection.metric).toBe('rate')
    expect(screen.getByText('Cause breakdowns are available for All ages only.')).toBeVisible()
  })
  it('updates country, theme and overview selections while keeping fixture values coherent', async () => {
    render(<App />)
    await screen.findByRole('heading', { level: 2, name: 'Heart' })
    fireEvent.click(screen.getByRole('button', { name: 'Country World' }))
    const search = screen.getByRole('combobox', { name: 'Search countries' })
    fireEvent.change(search, { target: { value: 'Japan' } }); fireEvent.keyDown(search, { key: 'Enter' })
    await waitFor(() => expect(document.querySelector('.population-context')).toHaveTextContent('Japan'))
    await waitFor(() => expect(document.querySelector('.big-stat')).toHaveTextContent(String(japan.values.deaths['2023'].both.all.ageStdRate[5])))
    fireEvent.change(screen.getByRole('combobox', { name: 'Color theme' }), { target: { value: 'light' } })
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection and show overview' }))
    const chart = await screen.findByRole('region', { name: 'Ranked organ groups' })
    fireEvent.click(within(chart).getByRole('button', { name: /^Brain:/ }))
    expect(screen.getByRole('heading', { level: 2, name: 'Brain' })).toBeVisible()
    expect(useExplorer.getState().selection.selectedOrgan).toBe('brain')
  })
  it('supports incoming navigation and includes the complete medical disclaimer and credits', async () => {
    render(<App />)
    await screen.findByRole('heading', { level: 2, name: 'Heart' })
    await act(async () => {
      window.history.replaceState(null, '', '#/about?location=WLD')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page')
    expect(await screen.findByText('Educational visualization of population-level statistics. It does not provide diagnosis, treatment advice, or individual risk estimates. Anatomical associations are simplified; see Methodology.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'CC Attribution 4.0 International' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/')
  })
  it('navigates directly to Quiz and preserves its route when a quiz selection changes', async () => {
    window.history.replaceState(null, '', '#/quiz')
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Make a connection.' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Quiz' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: 'Start Find the organ' }))
    expect(await screen.findByRole('listbox', { name: 'Organ groups' })).toBeVisible()
    fireEvent.click(screen.getByRole('option', { name: 'Brain' }))
    expect(window.location.hash).toContain('#/quiz?')
    expect(screen.getByRole('button', { name: 'Next question' })).toBeVisible()
  })
  it('loads the comparison matrix only on request and answers a Higher or lower question', async () => {
    window.history.replaceState(null, '', '#/quiz')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Prepare Higher or lower' }))
    const start = await screen.findByRole('button', { name: 'Start Higher or lower' })
    expect(start).toHaveFocus()
    fireEvent.click(start)
    expect(screen.getByRole('heading', { name: /which had more age-standardized deaths/ })).toBeVisible()
    fireEvent.click(screen.getAllByRole('button', { name: /Higher age-standardized death rate/ })[0])
    expect(document.querySelectorAll('.comparison-values dd')).toHaveLength(2)
    expect(screen.getByText(/Synthetic fixture data: these comparisons/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Next question' })).toBeVisible()
  })
})
