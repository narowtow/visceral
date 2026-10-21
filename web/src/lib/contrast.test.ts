// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync('src/index.css', 'utf8')

function luminance(hex: string) {
  const rgb = hex.match(/[a-f\d]{2}/gi)!.map(channel => parseInt(channel, 16) / 255)
    .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
}

describe('theme text contrast (WCAG AA normal text)', () => {
  for (const theme of ['dark', 'light']) it(`${theme} text and muted text meet 4.5:1 on every surface`, () => {
    const selector = theme === 'dark' ? ':root {' : ":root[data-theme='light'] {"
    const declarations = css.slice(css.indexOf(selector)).split('}')[0]
    const tokens = Object.fromEntries([...declarations.matchAll(/--([\w-]+):\s*(#[a-f\d]{6})/gi)].map(match => [match[1], match[2]]))
    for (const text of ['text', 'muted', 'blue']) for (const surface of ['bg', 'panel', 'panel-raised', 'selected']) {
      const a = luminance(tokens[text]), b = luminance(tokens[surface])
      expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05), `${theme}: ${text} on ${surface}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
