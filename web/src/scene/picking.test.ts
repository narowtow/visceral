import { expect, it } from 'vitest'
import { tappedOrgan } from './picking'

it('selects only short taps ending on the same organ', () => {
  const start = { x: 10, y: 10, id: 'heart' }
  expect(tappedOrgan(start, 12, 12, 'heart')).toBe('heart')
  expect(tappedOrgan(start, 15, 10, 'heart')).toBeNull()
  expect(tappedOrgan(start, 10, 10, 'lungs')).toBeNull()
  expect(tappedOrgan(null, 10, 10, 'heart')).toBeNull()
})
