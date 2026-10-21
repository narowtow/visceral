import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import CausesTable from './CausesTable'

vi.mock('../data/useResource', () => ({ useResource: () => ({ data: {
  schemaVersion: 1, mappingVersion: '0.1.0', causes: [
    { code: 1130, name: 'Ischaemic heart disease', organ: 'heart', relation: 'primary', rationale: 'Heart muscle ischaemia' },
    { code: 1140, name: 'Stroke', organ: 'brain', relation: 'primary', rationale: 'Brain blood vessels' },
    { code: 1100, name: 'Cardiovascular diseases', organ: null, relation: 'none', rationale: 'Aggregate ancestor' },
  ],
} }) }))
it('searches the loaded mapping and toggles hierarchy rows accessibly', () => {
  render(<CausesTable />)
  const table = screen.getByRole('table')
  expect(within(table).getAllByRole('row')).toHaveLength(3)
  fireEvent.click(screen.getByRole('checkbox', { name: 'Include hierarchy rows' }))
  expect(within(table).getAllByRole('row')).toHaveLength(4)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'brain' } })
  expect(within(table).getAllByRole('row')).toHaveLength(2)
  expect(within(table).getByText('Stroke')).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('1 matching causes')
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'unknown' } })
  expect(screen.getByText(/No matching causes/)).toBeVisible()
})
