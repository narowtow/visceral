import { expect, it } from 'vitest'
import html from '../index.html?raw'

it('declares the language and social preview metadata without preloading anatomy on other routes', () => {
  const document = new DOMParser().parseFromString(html, 'text/html')
  expect(document.documentElement.lang).toBe('en')
  expect(document.title).toBe('Explore · Visceral')
  for (const name of ['description', 'theme-color', 'twitter:card']) expect(document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')).toBeTruthy()
  for (const name of ['og:title', 'og:description', 'og:image', 'og:image:alt']) expect(document.querySelector(`meta[property="${name}"]`)?.getAttribute('content')).toBeTruthy()
  expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('%BASE_URL%brand/icon-512.png')
  expect(document.querySelector('link[rel="preload"][href*="visceral.glb"]')).toBeNull()
})
