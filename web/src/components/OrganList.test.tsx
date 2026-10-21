import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import OrganList from './OrganList'
describe('organ list', () => {
  it('supports arrow keys, Home/End, Enter and Space without the canvas', () => {
    const selectOrgan = vi.fn()
    render(<OrganList selected="brain" values={{ brain: 0, eyes: null }} color={() => '#336699'} selectOrgan={selectOrgan} />)
    const brain = screen.getByRole('option', { name: /Brain/ })
    brain.focus(); fireEvent.keyDown(brain, { key: 'ArrowDown' })
    const eyes = screen.getByRole('option', { name: /Eyes/ }); expect(eyes).toHaveFocus()
    fireEvent.keyDown(eyes, { key: 'Enter' }); expect(selectOrgan).toHaveBeenLastCalledWith('eyes')
    fireEvent.keyDown(eyes, { key: 'End' })
    const last = screen.getByRole('option', { name: /Other & unallocated/ }); expect(last).toHaveFocus()
    fireEvent.keyDown(last, { key: 'Home' }); expect(brain).toHaveFocus()
    fireEvent.keyDown(brain, { key: 'ArrowUp' }); expect(last).toHaveFocus()
    fireEvent.keyDown(last, { key: ' ' }); expect(selectOrgan).toHaveBeenLastCalledWith('other_unallocated')
    expect(brain).toHaveAttribute('aria-selected', 'true')
    expect(brain).toHaveTextContent('0'); expect(eyes).toHaveTextContent('No data')
  })
  it('filters groups and sorts values without treating missing as zero', () => {
    const selectOrgan = vi.fn()
    render(<OrganList selected={null} values={{ brain: null, heart: 20, eyes: 0 }} color={() => '#336699'} selectOrgan={selectOrgan} />)
    fireEvent.change(screen.getByLabelText('Sort organs'), { target: { value: 'value' } })
    expect(within(screen.getByRole('listbox')).getAllByRole('option')[0]).toHaveTextContent('Heart')
    fireEvent.change(screen.getByPlaceholderText('Search organ groups…'), { target: { value: 'kidney' } })
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(1)
    fireEvent.click(screen.getByRole('option', { name: /Kidneys/ }))
    expect(selectOrgan).toHaveBeenCalledWith('kidneys')
    fireEvent.change(screen.getByPlaceholderText('Search organ groups…'), { target: { value: 'zzzz' } })
    expect(screen.getByText('No matching organ groups.')).toBeVisible()
  })
})
