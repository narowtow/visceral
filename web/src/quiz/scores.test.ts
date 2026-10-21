import { beforeEach, expect, it, vi } from 'vitest'
import { readBest, saveBest } from './scores'

beforeEach(() => window.localStorage.clear())
it('keeps the maximum, separates modes and fixture scores, and ignores corrupt values', () => {
  expect(saveBest('find', false, 7)).toBe(7)
  expect(saveBest('find', false, 3)).toBe(7)
  expect(readBest('find', true)).toBe(0)
  expect(readBest('higher', false)).toBe(0)
  window.localStorage.setItem('visceral.quiz.v1.who.higher', '999')
  expect(readBest('higher', false)).toBe(0)
  expect(saveBest('higher', false, NaN)).toBe(0)
})
it('survives blocked storage access and writes while retaining the session best', () => {
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('Blocked') })
  expect(readBest('find', false)).toBe(0)
  expect(saveBest('find', false, 5, 8)).toBe(8)
})
it('handles quota failures', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota') })
  expect(saveBest('find', false, 9)).toBe(9)
})
