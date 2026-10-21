export const DATA_BASE = import.meta.env.VITE_DATA_BASE ?? `${import.meta.env.BASE_URL}data/`
const cache = new Map<string, unknown>()
interface Pending { controller: AbortController; promise: Promise<unknown>; consumers: number }
const pending = new Map<string, Pending>()

/** A canceled consumer never cancels a request another consumer still needs. */
export function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
  if (cache.has(url)) return Promise.resolve(cache.get(url) as T)
  let entry = pending.get(url)
  if (!entry) {
    const controller = new AbortController()
    entry = { controller, consumers: 0, promise: fetch(url, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(`Unable to load data (${response.status}).`)
      const result: unknown = await response.json()
      cache.set(url, result)
      return result
    }).finally(() => { if (pending.get(url)?.controller === controller) pending.delete(url) }) }
    pending.set(url, entry)
  }
  const request = entry
  request.consumers++
  return new Promise<T>((resolve, reject) => {
    let done = false
    const finish = () => {
      if (done) return false
      done = true
      signal?.removeEventListener('abort', abort)
      request.consumers--
      return true
    }
    const abort = () => {
      if (!finish()) return
      reject(new DOMException('Aborted', 'AbortError'))
      if (request.consumers === 0) { pending.delete(url); request.controller.abort() }
    }
    signal?.addEventListener('abort', abort, { once: true })
    request.promise.then(value => { if (finish()) resolve(value as T) }, error => { if (finish()) reject(error) })
  })
}
