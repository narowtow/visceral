import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import DatasetBanner from './DatasetBanner'

it('labels synthetic fixtures only, and identifies the real WHO export', () => {
  const { rerender } = render(<DatasetBanner release="SYNTHETIC FIXTURE (not WHO estimates)" />)
  expect(screen.getByText('DEVELOPMENT PREVIEW')).toBeVisible()
  expect(screen.getByText('Synthetic data · not WHO estimates')).toBeVisible()
  rerender(<DatasetBanner release="WHO GHE 2023" />)
  expect(screen.getByText('WHO GHE 2023')).toBeVisible()
  expect(screen.getByText('Population-level burden associated with mapped causes')).toBeVisible()
  expect(screen.queryByText(/DEVELOPMENT PREVIEW|Synthetic data/)).not.toBeInTheDocument()
})
