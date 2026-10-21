import { cloneElement } from 'react'
import type { ReactElement } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import manifest from '@contracts/fixtures/data/manifest.json'
import type { Manifest } from '../data/contract'
import AnalysisPage from './AnalysisPage'
import findings from '../test/fixtures/analysis/findings.json'

// Real Recharts SVG, with fixed measurement only: jsdom has no layout engine.
const viewport = vi.hoisted(() => ({ width: 700 }))
vi.mock('recharts', async importOriginal => ({
  ...await importOriginal<typeof import('recharts')>(),
  ResponsiveContainer: ({ children }: { children: ReactElement<{ width: number; height: number }> }) => cloneElement(children, { width: viewport.width, height: 420 }),
}))
const fixtures = import.meta.glob('../test/fixtures/analysis/*.json', { eager: true, import: 'default' })
function serveFixtures() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const file = String(input).split('/').at(-1)
    const value = fixtures[`../test/fixtures/analysis/${file}`]
    return new Response(JSON.stringify(value), { status: value ? 200 : 404, headers: { 'Content-Type': 'application/json' } })
  })
}
afterEach(() => { window.history.replaceState(null, '', '/') })
it.each([375, 700])('renders the ordered story and real charts at %i px, with tables, controls and country navigation', async width => {
  viewport.width = width
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches: query.includes('600px') && width <= 600, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }))
  const fetcher = serveFixtures()
  const { container } = render(<AnalysisPage manifest={manifest as Manifest} />)
  expect(screen.getByRole('heading', { level: 1, name: 'Where does disease burden appear to fall?' })).toBeVisible()
  await screen.findByRole('heading', { name: findings.findings[0].headline })
  expect(screen.getAllByRole('heading', { level: 2 }).slice(0, 5).map(heading => heading.textContent)).toEqual(findings.findings.map(finding => finding.headline))
  expect(screen.getByRole('link', { name: 'Explore the notebooks ↗' })).toHaveAttribute('href', 'https://github.com/narowtow/visceral/tree/main/pipeline/notebooks')
  await waitFor(() => expect(container.querySelectorAll('.analysis-plot .recharts-wrapper')).toHaveLength(9), { timeout: 10000 })
  expect(container.querySelectorAll('.analysis-source')).toHaveLength(9)
  expect(container.querySelector('.analysis-error')).not.toBeInTheDocument()
  expect(container.innerHTML).not.toMatch(/NaN|Infinity/)
  expect(container.querySelectorAll('.figure-global-trends .recharts-line-curve')).toHaveLength(3)
  expect(container.querySelectorAll('.figure-age-methods .recharts-scatter-symbol').length).toBeGreaterThan(0)
  expect(container.querySelectorAll('.figure-age-methods .recharts-errorBar').length).toBeGreaterThan(0)
  expect(fetcher.mock.calls.some(([url]) => String(url).endsWith('rank-correlations.json'))).toBe(false)
  const age = screen.getByRole('region', { name: 'Age structure changes country comparisons' })
  // jsdom cannot measure tick text. Verify the actual SVG tick positions:
  // both log axes must have the same round ticks, regardless of orientation.
  const positions = (axis: string, coordinate: string) => [...age.querySelectorAll(`.recharts-${axis} .recharts-cartesian-axis-tick-line`)].map(line => Number(line.getAttribute(coordinate)))
  const x = positions('xAxis', 'x1'), y = positions('yAxis', 'y1')
  expect(x).toHaveLength(11) // 10, 20, 30, 50, 70, 100, …, 1,000
  expect(y).toHaveLength(x.length)
  for (let i = 0; i < x.length; i++) expect((x[i] - x[0]) / (x.at(-1)! - x[0])).toBeCloseTo((y[i] - y[0]) / (y.at(-1)! - y[0]), 6)
  fireEvent.click(within(age).getByRole('button', { name: 'Show table' }))
  const link = within(age).getByRole('link', { name: 'Explore Japan' })
  expect(link.getAttribute('href')).toContain('location=JPN')
  expect(link.getAttribute('href')).toContain('metric=ageStdRate')
  fireEvent.click(within(age).getByRole('button', { name: 'Brain' }))
  fireEvent.click(within(age).getByRole('button', { name: 'DALYs' }))
  expect(within(age).getByRole('link', { name: 'Explore Japan' }).getAttribute('href')).toContain('selectedOrgan=brain')
  expect(within(age).getByRole('link', { name: 'Explore Japan' }).getAttribute('href')).toContain('measure=dalys')
  // The SVG click and HTML link use the same explicit explorer state.
  fireEvent.click(age.querySelector('circle')!)
  expect(window.location.hash).toContain('#/explore?')
  expect(window.location.hash).toContain('selectedOrgan=brain')
  const sex = screen.getByRole('region', { name: 'Male/female standardized burden ratios' })
  const ratioTicks = sex.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick-line')
  expect(ratioTicks.length).toBeGreaterThan(1)
  fireEvent.click(within(sex).getByRole('checkbox', { name: 'Show all eligible groups' }))
  await waitFor(() => expect(container.innerHTML).not.toMatch(/NaN|Infinity/))
  const details = container.querySelector('details')!
  fireEvent.click(within(details).getByText(/More comparisons/))
  await screen.findByRole('region', { name: 'Country ranking agreement by cause group' })
  for (const more of container.querySelectorAll('details:not([open])')) fireEvent.click(within(more as HTMLElement).getByText(/More comparisons/))
  await waitFor(() => expect(container.querySelectorAll('.analysis-plot .recharts-wrapper')).toHaveLength(14))
  expect(container.querySelectorAll('.analysis-source')).toHaveLength(14)
  expect(container.innerHTML).not.toMatch(/NaN|Infinity/)
  expect(screen.getByRole('heading', { name: 'Limitations' })).toBeVisible()
  expect(screen.getByRole('link', { name: /How this was computed/ })).toHaveAttribute('href', '#/methodology')
}, 15000)
