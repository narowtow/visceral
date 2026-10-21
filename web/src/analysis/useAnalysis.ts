import { useMemo } from 'react'
import { useResource } from '../data/useResource'

export function useAnalysis<T>(file: string, parse: (value: unknown) => T) {
  const resource = useResource<unknown>(`analysis/${file}`)
  const checked = useMemo(() => {
    if (resource.data === undefined) return {}
    try { return { data: parse(resource.data) } }
    catch (error) { return { error: error instanceof Error ? error.message : `Invalid analysis file: ${file}` } }
  }, [resource.data, parse, file])
  return { data: checked.data, error: resource.error ?? checked.error, retry: resource.retry }
}
