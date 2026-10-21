import { useEffect } from 'react'

/** Wait for a lazy route's heading, then focus it once; filters never steal focus. */
export function useRouteFocus(route: string) {
  useEffect(() => {
    const focusHeading = () => {
      // Suspense can retain the previous route's main with display:none.
      const heading = [...document.querySelectorAll<HTMLElement>('main h1')].find(candidate => {
        for (let node: HTMLElement | null = candidate; node; node = node.parentElement) {
          if (node.hidden || node.style.display === 'none') return false
        }
        return true
      })
      if (!heading) return false
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
      window.scrollTo?.({ top: 0, behavior: 'instant' })
      return true
    }
    if (focusHeading()) return
    const observer = new MutationObserver(() => { if (focusHeading()) observer.disconnect() })
    observer.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'hidden'] })
    return () => observer.disconnect()
  }, [route])
}
