import type { Selection, Value } from '../data/contract'
export const formatValue = (value: Value, compact = false) => value === null ? 'No data' : new Intl.NumberFormat('en', {
  maximumFractionDigits: compact ? 1 : 2, ...(compact ? { notation: 'compact' as const } : {}),
}).format(value)
// A display threshold, not an imputed value. Tables and axis ticks retain exact zero.
export function formatBurden(value: Value, compact = false) {
  const formatted = formatValue(value, compact)
  return value !== null && value >= 0 && formatted === '0' ? '<0.1' : formatted
}
export function units(s: Pick<Selection, 'metric' | 'measure'>) {
  const measure = s.measure === 'deaths' ? 'deaths' : 'DALYs'
  return s.metric === 'count' ? `Total ${measure}` : `${s.metric === 'ageStdRate' ? 'Age-standardized ' : ''}${measure} per 100,000`
}
