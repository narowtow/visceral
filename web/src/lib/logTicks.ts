/** Shared log-axis ticks, independent of observed values and chart orientation. */
export function logTicks([minimum, maximum]: readonly [number, number]): number[] {
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum <= 0 || maximum < minimum) return []
  const ticks: number[] = []
  for (let exponent = Math.floor(Math.log10(minimum)); exponent <= Math.ceil(Math.log10(maximum)); exponent++) {
    for (const multiple of [1, 2, 3, 5, 7]) {
      const value = Number((multiple * 10 ** exponent).toPrecision(12))
      if (value >= minimum && value <= maximum) ticks.push(value)
    }
  }
  return ticks
}
