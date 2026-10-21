import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import Boundary from './Boundary'

it('logs the actual caught error and reports it while rendering the fallback', () => {
  const error = new Error('Model decoder failed')
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  const onError = vi.fn()
  function Broken(): never { throw error }
  render(<Boundary onError={onError} fallback={<p role="status">3D model failed to load; showing schematic.</p>}><Broken /></Boundary>)
  expect(screen.getByRole('status')).toHaveTextContent('3D model failed to load; showing schematic.')
  expect(log).toHaveBeenCalledWith('[Visceral] Rendering failed:', error, expect.any(String))
  expect(onError).toHaveBeenCalledWith(error)
})
