import type { Causes } from './contract'
import { organs } from './contract'

export const organLabel = (id: string | null) => organs.find(organ => organ.id === id)?.label ?? 'Hierarchy / not counted'
export function filterCauses(causes: Causes['causes'], query: string, primaryOnly = true) {
  const terms = query.trim().toLocaleLowerCase('en').split(/\s+/).filter(Boolean)
  return causes.filter(cause => {
    if (primaryOnly && cause.relation !== 'primary') return false
    const text = `${cause.code} ${cause.name} ${organLabel(cause.organ)} ${cause.rationale}`.toLocaleLowerCase('en')
    return terms.every(term => text.includes(term))
  })
}
