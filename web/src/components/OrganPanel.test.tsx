import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import manifest from '@contracts/fixtures/data/manifest.json'
import world from '@contracts/fixtures/data/locations/WLD.json'
import { organs, validateManifest } from '../data/contract'
import type { LocationShard, Manifest } from '../data/contract'
import { defaults } from '../state/url'
import OrganPanel from './OrganPanel'

vi.mock('./Charts', () => ({ TrendChart: () => null }))

it('shows a display threshold for available zero rates, and keeps missing distinct', () => {
  const shard = structuredClone(world) as LocationShard
  const selection = { ...defaults, selectedOrgan: 'eyes' }
  const rates = shard.values.deaths![String(selection.year)]!.both!.all!.ageStdRate!
  rates[organs.findIndex(organ => organ.id === 'eyes')] = 0
  const props = { manifest: validateManifest(manifest as Manifest), shard, selection, color: () => '#336699' }
  const { container, rerender } = render(<OrganPanel {...props} />)
  expect(container.querySelector('.big-stat')).toHaveTextContent('<0.1')
  expect(screen.getByRole('button', { name: 'Show DALYs' })).toBeVisible()
  rates[organs.findIndex(organ => organ.id === 'eyes')] = null
  rerender(<OrganPanel {...props} />)
  expect(container.querySelector('.big-stat')).toHaveTextContent('No data')
  expect(screen.getByText('Unavailable for these filters. Missing values are not zero.')).toBeVisible()
})
