import { useEffect, useState } from 'react'
import { DATA_BASE, fetchJson } from './client'
export function useResource<T>(path: string | null) {
  const [result, setResult] = useState<{ path: string | null; data?: T; error?: string }>({ path: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    fetchJson<T>(`${DATA_BASE}${path}`, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ path, data })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResult({ path, error: error instanceof Error ? error.message : 'Unable to load data.' })
    })
    return () => controller.abort()
  }, [path, attempt])
  return { ...(result.path === path ? result : {}), retry: () => { setResult({ path: null }); setAttempt(n => n + 1) } }
}
