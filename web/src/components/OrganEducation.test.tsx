import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import OrganEducation from './OrganEducation'

it('shows the summary and discloses structures, mapping, fact and sources', () => {
  const { rerender } = render(<OrganEducation id="pancreas" />)
  expect(screen.getByRole('heading', { name: 'What it does' })).toBeVisible()
  const details = screen.getByText('Learn about this group').closest('details')!
  expect(details.open).toBe(false)
  fireEvent.click(screen.getByText('Learn about this group'))
  expect(details.open).toBe(true)
  expect(screen.getByRole('heading', { name: 'Key structures' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'How burden is counted here' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Did you know?' })).toBeVisible()
  rerender(<OrganEducation id="heart" />)
  expect(screen.getByText('Learn about this group').closest('details')!.open).toBe(false)
})
