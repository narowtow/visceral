import { describe, expect, it } from 'vitest'
import { logTicks } from './logTicks'

describe('shared logarithmic axis ticks', () => {
  it('uses round ticks across decades, independently of data samples', () => {
    expect(logTicks([10, 1000])).toEqual([10, 20, 30, 50, 70, 100, 200, 300, 500, 700, 1000])
    expect(logTicks([.1, 1])).toEqual([.1, .2, .3, .5, .7, 1])
  })
  it('clips to the domain and rejects nonpositive or invalid log domains', () => {
    expect(logTicks([17.9, 179])).toEqual([20, 30, 50, 70, 100])
    for (const domain of [[0, 100], [-1, 1], [10, 1], [NaN, 10], [1, Infinity]] as [number, number][]) expect(logTicks(domain)).toEqual([])
    expect(logTicks([1, 1])).toEqual([1])
  })
})
