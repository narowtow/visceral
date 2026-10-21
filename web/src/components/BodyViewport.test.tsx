import { useEffect } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import BodyViewport from './BodyViewport'
import type { SceneApi } from '../scene/BodyScene'
import { useExplorer } from '../state/store'

const api = vi.hoisted(() => ({ rotate: vi.fn(), zoom: vi.fn(), focus: vi.fn(), reset: vi.fn() }))
vi.mock('../scene/BodyScene', () => ({
  default: function SceneStub({ onApi, onModel }: { onApi: (api: SceneApi | null) => void; onModel: (label: string) => void }) {
    useEffect(() => { onApi(api); onModel('BodyParts3D anatomy'); return () => onApi(null) }, [onApi, onModel])
    return null
  },
}))

it('routes all keyboard-operable view buttons to the active scene API', async () => {
  const previous = useExplorer.getState().selection
  useExplorer.getState().selectOrgan('heart')
  try {
    render(<BodyViewport values={{}} color={() => '#336699'} theme="dark" narrow={false} openList={() => {}} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Zoom in' })).toBeEnabled())
    for (const name of ['Rotate left', 'Rotate right', 'Rotate up', 'Rotate down']) fireEvent.click(screen.getByRole('button', { name }))
    expect(api.rotate.mock.calls).toEqual([[-Math.PI / 8, 0], [Math.PI / 8, 0], [0, -Math.PI / 8], [0, Math.PI / 8]])
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(api.zoom.mock.calls).toEqual([[.25], [-.25]])
    fireEvent.click(screen.getByRole('button', { name: /Focus/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }))
    expect(api.focus).toHaveBeenCalledOnce()
    expect(api.reset).toHaveBeenCalledOnce()
  } finally {
    useExplorer.setState({ selection: previous })
  }
})
