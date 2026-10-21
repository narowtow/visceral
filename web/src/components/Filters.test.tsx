import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import fixture from '@contracts/fixtures/data/manifest.json'
import type { Manifest } from '../data/contract'
import { defaults } from '../state/url'
import { useExplorer } from '../state/store'
import Filters from './Filters'
const manifest = fixture as Manifest
describe('filters', () => {
  it('offers a searchable country list with World first and keyboard selection', () => {
    useExplorer.setState({ selection: defaults })
    render(<Filters manifest={manifest} selection={defaults} />)
    fireEvent.click(screen.getByRole('button', { name: 'Country World' }))
    expect(screen.getAllByRole('option', { name: /World/ })[0]).toHaveTextContent('World')
    const search = screen.getByRole('combobox', { name: 'Search countries' })
    fireEvent.change(search, { target: { value: 'jap' } })
    expect(screen.getByRole('option', { name: /Japan/ })).toBeVisible()
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(useExplorer.getState().selection.location).toBe('JPN')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Country World' })).toHaveFocus()
  })
  it('explains and disables age standardization for specific age groups', () => {
    const selection = { ...defaults, age: '0_4' as const, metric: 'rate' as const }
    useExplorer.setState({ selection })
    render(<Filters manifest={manifest} selection={selection} />)
    expect(screen.getByRole('option', { name: 'Age-standardized rate per 100,000' })).toBeDisabled()
    expect(screen.getByText(/Age-standardized rates require All ages/)).toBeVisible()
  })
})
