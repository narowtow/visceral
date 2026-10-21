import { describe, expect, it, vi } from 'vitest'
import { fetchJson } from './client'
describe('shared data cache', () => {
  it('deduplicates in-flight requests and reuses successful JSON', async () => {
    let respond!: (response: Response) => void
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(resolve => { respond = resolve }))
    const first = fetchJson('/test-cache.json'), second = fetchJson('/test-cache.json')
    expect(fetcher).toHaveBeenCalledTimes(1)
    respond(new Response('{"value":0}', { status: 200 }))
    expect(await first).toEqual({ value: 0 }); expect(await second).toEqual({ value: 0 })
    expect(await fetchJson('/test-cache.json')).toEqual({ value: 0 })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('cancels only the consumer while another subscriber needs the request', async () => {
    let respond!: (response: Response) => void
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(resolve => { respond = resolve }))
    const controller = new AbortController()
    const first = fetchJson('/test-shared.json', controller.signal), second = fetchJson('/test-shared.json')
    const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort(); await rejected
    const requestSignal = fetcher.mock.calls[0][1]?.signal
    expect(requestSignal?.aborted).toBe(false)
    respond(new Response('null', { status: 200 }))
    expect(await second).toBeNull()
  })
  it('aborts an unused request and allows a fresh retry', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const controller = new AbortController(), first = fetchJson('/test-abort.json', controller.signal)
    const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' })
    controller.abort(); await rejected
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true)
    fetcher.mockResolvedValue(new Response('{"retry":true}', { status: 200 }))
    expect(await fetchJson('/test-abort.json')).toEqual({ retry: true })
  })
  it('does not cache failures', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }))
    await expect(fetchJson('/test-failed.json')).rejects.toThrow('404')
    fetcher.mockResolvedValue(new Response('[]'))
    expect(await fetchJson('/test-failed.json')).toEqual([])
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
