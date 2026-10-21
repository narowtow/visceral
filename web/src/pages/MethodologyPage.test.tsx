import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import MethodologyPage from './MethodologyPage'

vi.mock('../components/CausesTable', () => ({ default: () => null }))
it('keeps section navigation inside the hash route and explains the two ASDR methods', () => {
  const scroll = vi.fn()
  Element.prototype.scrollIntoView = scroll
  window.history.replaceState(null, '', '#/methodology')
  render(<MethodologyPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Rates' }))
  expect(document.getElementById('standardization')).toHaveFocus()
  expect(window.location.hash).toBe('#/methodology')
  expect(scroll).toHaveBeenCalledOnce()
  expect(screen.getByRole('heading', { name: 'Country deaths: published cause rates' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'DALYs and World: broad-bin approximation' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'See Analysis' }).getAttribute('href')).toContain('#/analysis?')
  fireEvent.click(screen.getByText('A tiny worked example'))
  expect(screen.getByText('550 per 100,000')).toBeVisible()
  window.history.replaceState(null, '', '/')
})
