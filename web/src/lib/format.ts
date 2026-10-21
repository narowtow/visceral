import type { Selection, Value } from '../data/contract'
export const formatValue = (value: Value, compact = false) => value === null ? 'No data' : new Intl.NumberFormat('en', {
  maximumFractionDigits: compact ? 1 : 2, ...(compact ? { notation: 'compact' as const } : {}),
}).format(value)
export function units(s: Pick<Selection, 'metric' | 'measure'>) {
  const measure = s.measure === 'deaths' ? 'deaths' : 'DALYs'
  return s.metric === 'count' ? `Total ${measure}` : `${s.metric === 'ageStdRate' ? 'Age-standardized ' : ''}${measure} per 100,000`
}
